const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// Initialize Twitter client
const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

// File to track posted riddles
const POSTED_FILE = path.join(__dirname, 'posted-riddles.json');

// Initialize posted riddles file if it doesn't exist
function initPostedFile() {
  if (!fs.existsSync(POSTED_FILE)) {
    fs.writeFileSync(POSTED_FILE, JSON.stringify([]));
  }
}

// Get list of posted riddle IDs
function getPostedRiddles() {
  try {
    const data = fs.readFileSync(POSTED_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading posted riddles:', error);
    return [];
  }
}

// Mark riddle as posted
function markAsPosted(riddleId) {
  try {
    const posted = getPostedRiddles();
    posted.push(riddleId);
    fs.writeFileSync(POSTED_FILE, JSON.stringify(posted, null, 2));
    console.log(`Marked riddle ${riddleId} as posted`);
  } catch (error) {
    console.error('Error marking riddle as posted:', error);
  }
}

// Parse RSS XML to get riddles
function parseRSSFeed(xmlText) {
  const riddles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const guidRegex = /<guid.*?>(.*?)<\/guid>/;
  
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemXml = match[1];
    const titleMatch = titleRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const guidMatch = guidRegex.exec(itemXml);
    
    if (titleMatch && linkMatch) {
      // Extract slug from URL
      const url = linkMatch[1];
      const slug = url.split('/').filter(p => p).pop();
      
      // Use URL as ID (more stable than guid)
      const id = url;
      
      riddles.push({
        id: id,
        question: titleMatch[1]
          .replace(/&#8217;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&#8211;/g, '–')
          .replace(/&#8230;/g, '...')
          .replace(/&amp;/g, '&')
          .replace(/&#038;/g, '&'),
        slug: slug
      });
    }
  }
  
  return riddles;
}

// Fetch a random unposted riddle from WordPress RSS
async function getRandomUnpostedRiddle() {
  const posted = getPostedRiddles();
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Fetch RSS feed
      const response = await fetch('https://riddleking.co.uk/feed/');
      
      if (!response.ok) {
        throw new Error(`RSS feed returned ${response.status}`);
      }

      const xmlText = await response.text();
      const riddles = parseRSSFeed(xmlText);
      
      if (riddles.length === 0) {
        throw new Error('No riddles found in RSS feed');
      }
      
      console.log(`Found ${riddles.length} riddles in feed`);
      
      // Shuffle riddles for randomness
      const shuffled = riddles.sort(() => Math.random() - 0.5);
      
      // Find first unposted riddle
      for (const riddle of shuffled) {
        if (!posted.includes(riddle.id)) {
          return riddle;
        }
      }
      
      // If all riddles in feed have been posted, just use the first one
      console.log('All riddles in feed posted, using random one');
      return shuffled[0];

    } catch (error) {
      console.error(`Attempt ${attempts + 1} failed:`, error.message);
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  // If all riddles have been posted, reset the list
  if (posted.length > 10) {
    console.log('Posted list is large, resetting...');
    fs.writeFileSync(POSTED_FILE, JSON.stringify([]));
    return getRandomUnpostedRiddle();
  }

  throw new Error('Could not fetch riddle after multiple attempts');
}

// Post riddle to Twitter/X
async function postDailyRiddle() {
  try {
    console.log('Fetching riddle...');
    const riddle = await getRandomUnpostedRiddle();
    
    console.log(`Got riddle: ${riddle.question}`);

    // Format tweet
    const tweet = `🧩 Daily Riddle Challenge

${riddle.question}

Drop your answer below 👇
Check if you're right: https://riddleking.co.uk/${riddle.slug}

#Riddle #BrainTeaser #RiddleOfTheDay`;

    // Check tweet length (X allows 280 characters)
    if (tweet.length > 280) {
      console.warn(`Tweet is ${tweet.length} characters, might be too long`);
    }

    console.log('Posting to X...');
    const result = await rwClient.v2.tweet(tweet);
    
    console.log('Posted successfully!');
    console.log(`Tweet ID: ${result.data.id}`);
    
    // Mark as posted
    markAsPosted(riddle.id);
    
    return result;
  } catch (error) {
    console.error('Error posting riddle:', error);
    
    // Log more details if it's a Twitter API error
    if (error.data) {
      console.error('Twitter API error details:', JSON.stringify(error.data, null, 2));
    }
    
    throw error;
  }
}

// Test function - call this to post immediately
async function testPost() {
  console.log('=== TEST MODE ===');
  console.log('Posting riddle now...\n');
  await postDailyRiddle();
  console.log('\n=== TEST COMPLETE ===');
}

// Main function
async function main() {
  initPostedFile();
  
  // Check if we're in test mode
  const isTest = process.argv.includes('--test');
  
  if (isTest) {
    await testPost();
    process.exit(0);
  }
  
  console.log('🧩 Riddle King Bot Started!');
  console.log('Scheduled to post daily at 9:00 AM UTC');
  console.log('Current time:', new Date().toISOString());
  
  // Schedule daily post at 9 AM UTC (adjust timezone as needed)
  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰ Scheduled time reached!');
    console.log('Time:', new Date().toISOString());
    try {
      await postDailyRiddle();
    } catch (error) {
      console.error('Failed to post scheduled riddle');
    }
  });
  
  console.log('Bot is running... Press Ctrl+C to stop\n');
}

// Run the bot
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
