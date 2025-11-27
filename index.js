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

// Fetch a random unposted riddle from WordPress
async function getRandomUnpostedRiddle() {
  const posted = getPostedRiddles();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    try {
      // Fetch random posts from WordPress REST API
      const response = await fetch(
        'https://riddleking.co.uk/wp-json/wp/v2/posts?per_page=5&orderby=rand&_fields=id,title,slug'
      );
      
      if (!response.ok) {
        throw new Error(`WordPress API returned ${response.status}`);
      }

      const posts = await response.json();
      
      // Find first unposted riddle
      for (const post of posts) {
        if (!posted.includes(post.id)) {
          return {
            id: post.id,
            question: post.title.rendered
              .replace(/&#8217;/g, "'")
              .replace(/&#8220;/g, '"')
              .replace(/&#8221;/g, '"')
              .replace(/&#8211;/g, '–')
              .replace(/&#8230;/g, '...')
              .replace(/&amp;/g, '&'),
            slug: post.slug
          };
        }
      }

      attempts++;
    } catch (error) {
      console.error(`Attempt ${attempts} failed:`, error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
    }
  }

  // If all riddles have been posted, reset the list
  if (posted.length > 0) {
    console.log('All riddles posted! Resetting list...');
    fs.writeFileSync(POSTED_FILE, JSON.stringify([]));
    return getRandomUnpostedRiddle(); // Try again with empty list
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
