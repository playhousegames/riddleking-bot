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

// Riddles database - 100 riddles from riddleking.co.uk
const RIDDLES_DATABASE = [
  { id: 1, question: "What word looks the same upside down and backwards?", slug: "what-word-looks-the-same-upside-down-and-backwards" },
  { id: 2, question: "A drawer contains 10 blue socks and 10 red socks. Without looking, how many socks must you take out to ensure you have a matching pair?", slug: "the-sock-drawer" },
  { id: 3, question: "I am a three-digit number. My tens digit is six more than my ones digit. My hundreds digit is eight less than my tens digit. What number am I?", slug: "i-am-a-three-digit-number" },
  { id: 4, question: "If eight men can build eight walls in eight hours, how many men could build four walls in four hours?", slug: "if-eight-men-can-build-eight-walls" },
  { id: 5, question: "Forward I am heavy, but backward I am not. What am I?", slug: "forward-i-am-heavy" },
  { id: 6, question: "Four brothers run around the world, but never meet each other. Who are they?", slug: "four-brothers-run-around-the-world" },
  { id: 7, question: "I'm light as a feather, yet the strongest person can't hold me for more than a few minutes. What am I?", slug: "im-light-as-a-feather" },
  { id: 8, question: "A man was walking in the rain. He didn't have an umbrella and he wasn't wearing a hat. His clothes got soaked, yet not a single hair on his head got wet. How could this happen?", slug: "a-man-was-walking-in-the-rain" },
  { id: 9, question: "I have cities but no houses, forests but no trees, and rivers but no water. What am I?", slug: "i-have-cities-but-no-houses" },
  { id: 10, question: "The more of this there is, the less you see. What is it?", slug: "the-more-of-this-there-is" },
  { id: 11, question: "Everyone has it and no one can lose it. What is it?", slug: "everyone-has-it-and-no-one-can-lose-it" },
  { id: 12, question: "It's red, blue, purple and green. No one can reach it, not even the queen. What is it?", slug: "its-red-blue-purple-and-green" },
  { id: 13, question: "A doctor gives you three pills and tells you to take one every half hour. How long will the pills last?", slug: "a-doctor-gives-you-three-pills" },
  { id: 14, question: "Four men were in a boat on the lake. The boat turns over, and all four men sink to the bottom of the lake, yet not a single man got wet! Why?", slug: "four-men-were-in-a-boat" },
  { id: 15, question: "What can burn the eyes without touching them?", slug: "what-can-burn-the-eyes" },
  { id: 16, question: "Seven men have seven wives. Each wife has seven sacks. Each sack has seven cats. Each cat has seven kittens. How many legs are there in all?", slug: "seven-men-have-seven-wives" },
  { id: 17, question: "If you divide 30 by half and add 10, what do you get?", slug: "if-you-divide-30-by-half" },
  { id: 18, question: "What is always coming but never arrives?", slug: "what-is-always-coming" },
  { id: 19, question: "The more you take away, the larger I become. What am I?", slug: "the-more-you-take-away" },
  { id: 20, question: "I am taken from a mine, and shut in a wooden case, from which I am never released, and yet I am used by almost every person. What am I?", slug: "i-am-taken-from-a-mine" },
  { id: 21, question: "They come at night without being called and are lost in the day without being stolen. What are they?", slug: "they-come-at-night" },
  { id: 22, question: "A cowboy rides into town on Friday, stays three days, and leaves on Friday. How is this possible?", slug: "a-cowboy-rides-into-town" },
  { id: 23, question: "What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?", slug: "what-can-run-but-never-walks" },
  { id: 24, question: "Using only addition, add eight 8's to get the number 1,000.", slug: "using-only-addition-add-eight-8s" },
  { id: 25, question: "You have two identical ropes that burn irregularly. Each rope takes exactly 60 minutes to burn completely. How can you measure 45 minutes?", slug: "you-have-two-identical-ropes" },
  { id: 26, question: "What English word has three consecutive double letters?", slug: "what-english-word-has-three-consecutive-double-letters" },
  { id: 27, question: "A man is looking at a photograph of someone. His friend asks who it is. The man replies, 'Brothers and sisters, I have none. But that man's father is my father's son.' Who is in the photograph?", slug: "brothers-and-sisters-i-have-none" },
  { id: 28, question: "If you have me, you want to share me. If you share me, you haven't got me. What am I?", slug: "if-you-have-me-you-want-to-share-me" },
  { id: 29, question: "Two fathers and two sons went fishing. They caught three fish which they divided equally, so each person got exactly one fish. How is this possible?", slug: "two-fathers-and-two-sons" },
  { id: 30, question: "What is at the beginning of eternity, the end of time and space, the beginning of every end, and the end of every race?", slug: "what-is-at-the-beginning-of-eternity" },
  { id: 31, question: "Four people need to cross a rickety bridge at night. They have one flashlight and the bridge is too dangerous to cross without it. One person can cross in 1 minute, another in 2 minutes, another in 7 minutes, and the last in 10 minutes. What is the shortest time it takes for all four to cross?", slug: "four-people-need-to-cross-a-rickety-bridge" },
  { id: 32, question: "There are 100 closed doors in a row, numbered 1 to 100. A person walks by each door, opening every door. A second person walks by each door, closing every second door. A third person walks by, toggling every third door. This continues for 100 people. After all 100 people have walked by, which doors are open?", slug: "the-string-riddle" },
  { id: 33, question: "What word is spelled incorrectly in every dictionary?", slug: "what-word-is-spelled-incorrectly" },
  { id: 34, question: "What belongs to you but others use it more than you do?", slug: "what-belongs-to-you" },
  { id: 35, question: "If 5 cats can catch 5 mice in 5 minutes, how many cats would be needed to catch 100 mice in 100 minutes?", slug: "if-5-cats-can-catch-5-mice" },
  { id: 36, question: "What weighs more: a pound of feathers or a pound of gold?", slug: "what-weighs-more" },
  { id: 37, question: "What gets bigger when more is taken away?", slug: "what-gets-bigger-when-more-is-taken-away" },
  { id: 38, question: "I am your brother but you are not my brother. Who am I?", slug: "i-am-your-brother" },
  { id: 39, question: "I have no life, but I can die. What am I?", slug: "i-have-no-life-but-i-can-die" },
  { id: 40, question: "What can't be used until it's broken?", slug: "what-cant-be-used-until-its-broken" },
  { id: 41, question: "What has a neck but no head?", slug: "what-has-a-neck-but-no-head" },
  { id: 42, question: "What has to be broken before you can use it?", slug: "what-has-to-be-broken-before-you-can-use-it" },
  { id: 43, question: "David's parents have three sons: Snap, Crackle, and ____?", slug: "davids-parents-have-three-sons" },
  { id: 44, question: "I run, yet I have no legs. What am I?", slug: "i-run-yet-i-have-no-legs" },
  { id: 45, question: "What can travel around the world while staying in a corner?", slug: "what-can-travel-around-the-world" },
  { id: 46, question: "The more you take, the more you leave behind. What am I?", slug: "the-more-you-take" },
  { id: 47, question: "What is so delicate that saying its name breaks it?", slug: "what-is-so-delicate" },
  { id: 48, question: "A man buys a horse for $60, sells it for $70, buys it back for $80, and finally sells it for $90. How much profit did he make?", slug: "a-man-buys-a-horse" },
  { id: 49, question: "Which is heavier: a pound of feathers or a pound of rocks?", slug: "which-is-heavier" },
  { id: 50, question: "A brick weighs 3 pounds plus half its weight. How much does the brick weigh?", slug: "a-brick-weighs-3-pounds" },
  { id: 51, question: "If you multiply me by any number, the sum of the digits in the result will always be 9. What number am I?", slug: "if-you-multiply-me-by-any-number" },
  { id: 52, question: "What kind of clock is only right twice a day?", slug: "what-kind-of-clock" },
  { id: 53, question: "What shape has the most sides?", slug: "what-shape-has-the-most-sides" },
  { id: 54, question: "I have keys but no locks. I have space but no room. You can enter but can't go outside. What am I?", slug: "i-have-keys-but-no-locks" },
  { id: 55, question: "What comes once in a minute, twice in a moment, but never in a thousand years?", slug: "what-comes-once-in-a-minute" },
  { id: 56, question: "What has hands but cannot clap?", slug: "what-has-hands-but-cannot-clap" },
  { id: 57, question: "What has an eye but cannot see?", slug: "what-has-an-eye-but-cannot-see" },
  { id: 58, question: "What building has the most stories?", slug: "what-building-has-the-most-stories" },
  { id: 59, question: "What gets wetter the more it dries?", slug: "what-gets-wetter-the-more-it-dries" },
  { id: 60, question: "What can you catch but not throw?", slug: "what-can-you-catch-but-not-throw" },
  { id: 61, question: "What has a thumb and four fingers but is not alive?", slug: "what-has-a-thumb-and-four-fingers" },
  { id: 62, question: "What goes up but never comes down?", slug: "what-goes-up-but-never-comes-down" },
  { id: 63, question: "What has many teeth but cannot bite?", slug: "what-has-many-teeth-but-cannot-bite" },
  { id: 64, question: "What can fill a room but takes up no space?", slug: "what-can-fill-a-room" },
  { id: 65, question: "What occurs once in every minute, twice in every moment, yet never in a thousand years?", slug: "what-occurs-once-in-every-minute" },
  { id: 66, question: "I have branches, but no fruit, trunk or leaves. What am I?", slug: "i-have-branches-but-no-fruit" },
  { id: 67, question: "What month of the year has 28 days?", slug: "what-month-of-the-year-has-28-days" },
  { id: 68, question: "What question can you never answer yes to?", slug: "what-question-can-you-never-answer-yes-to" },
  { id: 69, question: "What is full of holes but still holds water?", slug: "what-is-full-of-holes" },
  { id: 70, question: "What can you break, even if you never pick it up or touch it?", slug: "what-can-you-break-even-if-you-never-pick-it-up" },
  { id: 71, question: "A woman shoots her husband, then holds him underwater for five minutes. Next, she hangs him. Right after, they enjoy a lovely dinner. How?", slug: "a-woman-shoots-her-husband" },
  { id: 72, question: "I'm tall when I'm young and short when I'm old. What am I?", slug: "im-tall-when-im-young" },
  { id: 73, question: "What begins with T, ends with T, and has T in it?", slug: "what-begins-with-t-ends-with-t" },
  { id: 74, question: "What has a head and a tail but no body?", slug: "what-has-a-head-and-a-tail" },
  { id: 75, question: "What is always in front of you but can't be seen?", slug: "what-is-always-in-front-of-you" },
  { id: 76, question: "What is black when you buy it, red when you use it, and gray when you throw it away?", slug: "what-is-black-when-you-buy-it" },
  { id: 77, question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", slug: "i-speak-without-a-mouth" },
  { id: 78, question: "What invention lets you look right through a wall?", slug: "what-invention-lets-you-look-through-a-wall" },
  { id: 79, question: "What disappears as soon as you say its name?", slug: "what-disappears-as-soon-as-you-say-its-name" },
  { id: 80, question: "If you drop me I'm sure to crack, but give me a smile and I'll always smile back. What am I?", slug: "if-you-drop-me-im-sure-to-crack" },
  { id: 81, question: "The person who makes it has no need for it. The person who buys it has no use for it. The person who uses it can neither see nor feel it. What is it?", slug: "the-person-who-makes-it" },
  { id: 82, question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?", slug: "i-have-cities-but-no-houses-2" },
  { id: 83, question: "What can you hold in your right hand but never in your left hand?", slug: "what-can-you-hold-in-your-right-hand" },
  { id: 84, question: "What is seen in the middle of March and April that can't be seen at the beginning or end of either month?", slug: "what-is-seen-in-the-middle-of-march" },
  { id: 85, question: "I am not alive, but I grow. I don't have lungs, but I need air. I don't have a mouth, but water kills me. What am I?", slug: "i-am-not-alive-but-i-grow" },
  { id: 86, question: "Turn me on my side and I am everything. Cut me in half and I am nothing. What am I?", slug: "turn-me-on-my-side" },
  { id: 87, question: "What has 13 hearts but no other organs?", slug: "what-has-13-hearts" },
  { id: 88, question: "What comes down but never goes up?", slug: "what-comes-down-but-never-goes-up" },
  { id: 89, question: "What runs around the whole yard without moving?", slug: "what-runs-around-the-whole-yard" },
  { id: 90, question: "What has words but never speaks?", slug: "what-has-words-but-never-speaks" },
  { id: 91, question: "I have lakes with no water, mountains with no stone, and cities with no buildings. What am I?", slug: "i-have-lakes-with-no-water" },
  { id: 92, question: "What has one head, one foot, and four legs?", slug: "what-has-one-head-one-foot-and-four-legs" },
  { id: 93, question: "What can you keep after giving to someone?", slug: "what-can-you-keep-after-giving-to-someone" },
  { id: 94, question: "I shave every day, but my beard stays the same. What am I?", slug: "i-shave-every-day" },
  { id: 95, question: "You see a boat filled with people, yet there isn't a single person on board. How is that possible?", slug: "you-see-a-boat-filled-with-people" },
  { id: 96, question: "A man dies of old age on his 25th birthday. How is this possible?", slug: "a-man-dies-of-old-age" },
  { id: 97, question: "I have no feet, no hands, no wings, but I climb to the sky. What am I?", slug: "i-have-no-feet-no-hands-no-wings" },
  { id: 98, question: "What word contains 26 letters but only has three syllables?", slug: "what-word-contains-26-letters" },
  { id: 99, question: "What 5-letter word typed in all capital letters can be read the same upside down?", slug: "what-5-letter-word-typed-in-all-capital-letters" },
  { id: 100, question: "I make two people out of one. What am I?", slug: "i-make-two-people-out-of-one" }
];

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

// Get a random unposted riddle from the database
function getRandomUnpostedRiddle() {
  const posted = getPostedRiddles();
  
  if (RIDDLES_DATABASE.length === 0) {
    throw new Error('No riddles in database!');
  }
  
  console.log(`Database has ${RIDDLES_DATABASE.length} riddles, ${posted.length} already posted`);
  
  // Find unposted riddles
  const unposted = RIDDLES_DATABASE.filter(riddle => !posted.includes(riddle.id));
  
  // If all riddles posted, reset the list
  if (unposted.length === 0) {
    console.log('All riddles posted! Resetting list...');
    fs.writeFileSync(POSTED_FILE, JSON.stringify([]));
    // Pick a random riddle after reset
    const randomIndex = Math.floor(Math.random() * RIDDLES_DATABASE.length);
    return RIDDLES_DATABASE[randomIndex];
  }
  
  // Pick random unposted riddle
  const randomIndex = Math.floor(Math.random() * unposted.length);
  return unposted[randomIndex];
}

// Post riddle to Twitter/X
async function postDailyRiddle() {
  try {
    console.log('Fetching riddle...');
    const riddle = getRandomUnpostedRiddle();
    
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
  console.log(`Loaded ${RIDDLES_DATABASE.length} riddles`);
  
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
