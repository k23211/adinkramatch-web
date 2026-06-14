export type Question = {
    question: string;
    options: string[];
    correct: string;
    symbol?: string; // emoji of the adinkra symbol
};

export type AnAnseStory = {
    id: number;
    title: string;
    story: string;
    moral: string;
    questions: Question[];
};

export const ANANSE_STORIES: AnAnseStory[] = [
    {
        id: 1,
        title: "Ananse and the Sky God's Stories",
        story:
            "Long ago, all the world's stories belonged to Nyame, the Sky God. Ananse the spider wanted them badly. Nyame laughed and said: 'Bring me Onini the Python, Osebo the Leopard, and the Mmoboro hornets — then the stories are yours.' Everyone thought Ananse would fail. But with cleverness and patience, Ananse captured all three and brought them to Nyame. From that day, all stories became known as Spider Stories.",
        moral: "Wisdom and patience can overcome any obstacle.",
        questions: [
            {
                question: "Who owned all the world's stories at the beginning?",
                options: ["Ananse", "Nyame", "Onini", "Osebo"],
                correct: "Nyame",
                symbol: "☀️",
            },
            {
                question: "Which Adinkra symbol means 'supremacy of God'?",
                options: ["Sankofa", "Gye Nyame", "Dwennimmen", "Funtunfunefu"],
                correct: "Gye Nyame",
                symbol: "✨",
            },
            {
                question: "What did Ananse use to defeat Osebo the Leopard?",
                options: ["Strength", "A weapon", "Cleverness and a trap", "Help from friends"],
                correct: "Cleverness and a trap",
                symbol: "🕷️",
            },
            {
                question: "Which symbol represents wisdom and creativity — qualities Ananse used?",
                options: ["Ananse Ntontan", "Akoma", "Aya", "Bese Saka"],
                correct: "Ananse Ntontan",
                symbol: "🕸️",
            },
            {
                question: "What is the lesson from Ananse's story?",
                options: [
                    "Only the strong survive",
                    "Wisdom and patience overcome obstacles",
                    "Never trust a spider",
                    "Stories belong to everyone",
                ],
                correct: "Wisdom and patience overcome obstacles",
                symbol: "📖",
            },
        ],
    },
    {
        id: 2,
        title: "Ananse and the Pot of Wisdom",
        story:
            "Ananse once gathered all the wisdom in the world and put it in a huge pot. He wanted to hide it at the top of a tall tree so only he could use it. He tied the pot to his belly and tried to climb, but kept slipping. His young son Ntikuma watched and said: 'Father, why not tie the pot to your back instead?' Ananse tried it and climbed easily. He was so ashamed that a child outsmarted him that he threw the pot down, and wisdom scattered across the whole world.",
        moral: "No one person can hold all wisdom — it belongs to everyone.",
        questions: [
            {
                question: "What did Ananse put inside the pot?",
                options: ["Gold", "All the wisdom in the world", "Spider webs", "Stories"],
                correct: "All the wisdom in the world",
                symbol: "🏺",
            },
            {
                question: "Who gave Ananse the clever idea to climb the tree?",
                options: ["Nyame", "His wife", "Ntikuma his son", "A passing elder"],
                correct: "Ntikuma his son",
                symbol: "👦",
            },
            {
                question: "Which Adinkra symbol means 'knowledge is like a garden — share it'?",
                options: ["Nyansapo", "Odo Nnyew Fie Kwan", "Wawa Aba", "Nkyinkyim"],
                correct: "Nyansapo",
                symbol: "🧠",
            },
            {
                question: "What happened when Ananse dropped the pot?",
                options: [
                    "The pot broke and wisdom was lost",
                    "Wisdom scattered across the world",
                    "Nyame took it back",
                    "Ntikuma caught it",
                ],
                correct: "Wisdom scattered across the world",
                symbol: "💫",
            },
            {
                question: "Which symbol represents wisdom and intelligence in Adinkra?",
                options: ["Nyansapo", "Sankofa", "Gye Nyame", "Akoma"],
                correct: "Nyansapo",
                symbol: "✨",
            },
        ],
    },
    {
        id: 3,
        title: "The Chief Who Forgot His People",
        story:
            "There was once a great chief who became so powerful he forgot the people who made him great. He built walls around his palace and stopped listening to elders. One day, a drought came. The crops died and the people suffered. An old woman reminded him of the Sankofa bird — the bird that flies forward but looks back to remember where it came from. The chief was ashamed, tore down the walls, and ruled with humility again. The rains returned.",
        moral: "Never forget your roots and the people who lifted you up.",
        questions: [
            {
                question: "What did the chief do wrong?",
                options: [
                    "He fought wars",
                    "He forgot his people and stopped listening",
                    "He gave away all the food",
                    "He left the village",
                ],
                correct: "He forgot his people and stopped listening",
                symbol: "👑",
            },
            {
                question: "What is the Sankofa symbol about?",
                options: [
                    "Looking to the future only",
                    "Learning from the past while moving forward",
                    "Forgetting old ways",
                    "The power of chiefs",
                ],
                correct: "Learning from the past while moving forward",
                symbol: "🐦",
            },
            {
                question: "What natural disaster struck because of the chief's pride?",
                options: ["A flood", "An earthquake", "A drought", "A storm"],
                correct: "A drought",
                symbol: "☀️",
            },
            {
                question: "Which Adinkra symbol represents humility of the powerful?",
                options: ["Akoma Ntoso", "Dwennimmen", "Aya", "Bese Saka"],
                correct: "Dwennimmen",
                symbol: "🐏",
            },
            {
                question: "What did the chief do to show he had changed?",
                options: [
                    "He gave gold to everyone",
                    "He tore down the walls and ruled with humility",
                    "He stepped down from power",
                    "He left to find wisdom",
                ],
                correct: "He tore down the walls and ruled with humility",
                symbol: "🏰",
            },
        ],
    },
    {
        id: 4,
        title: "Ananse and the Three Brothers",
        story:
            "Three brothers found a magical seed that could grant one wish. They argued for days — the first wanted wealth, the second wanted power, the third wanted wisdom. They could not agree. Ananse appeared and said: 'Plant it together.' They did, and a great tree grew with fruit enough for the whole village. Each brother got something — the fruit sold for wealth, the village made the first brother chief, and the third brother was praised for suggesting they listen to Ananse. Wisdom had won after all.",
        moral: "Unity and wisdom bring greater rewards than selfish desires.",
        questions: [
            {
                question: "What did the third brother wish for?",
                options: ["Wealth", "Power", "Wisdom", "Land"],
                correct: "Wisdom",
                symbol: "🌟",
            },
            {
                question: "What did Ananse advise the brothers to do with the seed?",
                options: [
                    "Sell it",
                    "Give it to the chief",
                    "Plant it together",
                    "Divide it into three",
                ],
                correct: "Plant it together",
                symbol: "🌱",
            },
            {
                question: "Which Adinkra symbol represents unity and togetherness?",
                options: ["Funtunfunefu Denkyemfunefu", "Aya", "Nkyinkyim", "Akoma"],
                correct: "Funtunfunefu Denkyemfunefu",
                symbol: "🐊",
            },
            {
                question: "What grew from the seed the brothers planted together?",
                options: ["A flower", "A great tree with fruit", "A small herb", "Nothing"],
                correct: "A great tree with fruit",
                symbol: "🌳",
            },
            {
                question: "Which symbol means 'adaptability and resourcefulness'?",
                options: ["Nkyinkyim", "Gye Nyame", "Sankofa", "Akoma Ntoso"],
                correct: "Nkyinkyim",
                symbol: "〰️",
            },
        ],
    },
    {
        id: 5,
        title: "The Brave Woman of Asante",
        story:
            "When enemies threatened her village, all the men fled in fear. A woman named Abena stood up and said: 'I will not leave my home.' She gathered the women and children, hid them safely, then used her knowledge of the forest paths to mislead the enemies until the men could return. When peace came, the chief honored her with a golden stool symbol. People said her heart was stronger than iron.",
        moral: "Courage and love for one's people is the greatest strength.",
        questions: [
            {
                question: "What did Abena do when the enemies came?",
                options: [
                    "She fled with the men",
                    "She surrendered to the enemies",
                    "She protected her people using forest knowledge",
                    "She called for Ananse",
                ],
                correct: "She protected her people using forest knowledge",
                symbol: "🌿",
            },
            {
                question: "Which Adinkra symbol represents bravery and fearlessness?",
                options: ["Akofena", "Aya", "Sankofa", "Nyansapo"],
                correct: "Akofena",
                symbol: "⚔️",
            },
            {
                question: "What did the chief give Abena as an honor?",
                options: ["A palace", "Gold coins", "A golden stool symbol", "Land"],
                correct: "A golden stool symbol",
                symbol: "🪑",
            },
            {
                question: "Which symbol means 'the heart' and represents love and patience?",
                options: ["Akoma", "Gye Nyame", "Dwennimmen", "Bese Saka"],
                correct: "Akoma",
                symbol: "❤️",
            },
            {
                question: "What is the Aya symbol associated with?",
                options: [
                    "Endurance and resourcefulness",
                    "Wealth and prosperity",
                    "Love and unity",
                    "The sky god",
                ],
                correct: "Endurance and resourcefulness",
                symbol: "🌿",
            },
        ],
    },
    {
        id: 6,
        title: "Ananse and the Moon",
        story:
            "Ananse was jealous of the moon's beauty and decided to steal it. He spun a web all the way to the sky and grabbed the moon. But the moon was too heavy and Ananse fell, tangled in his own web. The moon laughed gently and said: 'Ananse, some things are not meant to be owned. Beauty is for all to share.' Ananse learned that day that greed leads to your own undoing.",
        moral: "Greed and jealousy lead to your own downfall.",
        questions: [
            {
                question: "Why did Ananse want to steal the moon?",
                options: ["For light", "Out of jealousy of its beauty", "To sell it", "To give it to Nyame"],
                correct: "Out of jealousy of its beauty",
                symbol: "🌙",
            },
            {
                question: "What happened to Ananse when he grabbed the moon?",
                options: [
                    "He succeeded",
                    "He fell tangled in his own web",
                    "The moon disappeared",
                    "Nyame stopped him",
                ],
                correct: "He fell tangled in his own web",
                symbol: "🕸️",
            },
            {
                question: "Which Adinkra symbol warns against greed?",
                options: ["Hwemudua", "Akoma", "Odo Nnyew Fie Kwan", "Nkyinkyim"],
                correct: "Hwemudua",
                symbol: "📏",
            },
            {
                question: "What lesson did the moon teach Ananse?",
                options: [
                    "Climb higher next time",
                    "Beauty is for all to share, not to own",
                    "The moon belongs to Nyame",
                    "Webs are not strong enough",
                ],
                correct: "Beauty is for all to share, not to own",
                symbol: "🌙",
            },
            {
                question: "Which symbol represents love that never loses its way home?",
                options: ["Odo Nnyew Fie Kwan", "Gye Nyame", "Funtunfunefu", "Akofena"],
                correct: "Odo Nnyew Fie Kwan",
                symbol: "❤️",
            },
        ],
    },
    {
        id: 7,
        title: "The Tortoise and the Kente Cloth",
        story:
            "A tortoise once found a beautiful piece of Kente cloth and wore it to every gathering, boasting it made him special. The weavers who made it were never thanked. One day the cloth tore and the tortoise had nothing. An elder said: 'The beauty was never in the cloth — it was in the hands that made it.' From then on, the tortoise learned to honor the craftspeople and their work.",
        moral: "Honor those whose labor creates the beauty you enjoy.",
        questions: [
            {
                question: "What did the tortoise boast about?",
                options: [
                    "His speed",
                    "A beautiful Kente cloth",
                    "His wisdom",
                    "His shell",
                ],
                correct: "A beautiful Kente cloth",
                symbol: "🎨",
            },
            {
                question: "Who did the tortoise fail to honor?",
                options: ["The chief", "The weavers who made the cloth", "Ananse", "The elders"],
                correct: "The weavers who made the cloth",
                symbol: "🧵",
            },
            {
                question: "Which Adinkra symbol represents excellence and superior quality?",
                options: ["Hwemudua", "Nkyinkyim", "Aya", "Akoma"],
                correct: "Hwemudua",
                symbol: "📏",
            },
            {
                question: "What happened to the Kente cloth?",
                options: ["It was stolen", "It tore", "It was sold", "The chief took it"],
                correct: "It tore",
                symbol: "🎨",
            },
            {
                question: "Which symbol represents hard work and diligence?",
                options: ["Aban", "Wawa Aba", "Gye Nyame", "Sankofa"],
                correct: "Wawa Aba",
                symbol: "🌰",
            },
        ],
    },
    {
        id: 8,
        title: "Ananse Tricks the Lion",
        story:
            "The lion declared himself king and demanded every animal bring him food daily or face punishment. Ananse refused. 'A true king serves his people, not the other way around,' he said. The lion roared and chased Ananse, but Ananse led him into a muddy swamp where the lion got stuck. The other animals, inspired by Ananse's courage, together pulled new roots to build a better home — free from the lion's tyranny.",
        moral: "A true leader serves their people. Courage inspires others to act.",
        questions: [
            {
                question: "What did the lion demand from all animals?",
                options: [
                    "Gold",
                    "Food every day",
                    "To bow before him",
                    "Their homes",
                ],
                correct: "Food every day",
                symbol: "🦁",
            },
            {
                question: "What did Ananse say a true king should do?",
                options: [
                    "Rule with an iron fist",
                    "Serve his people",
                    "Collect taxes",
                    "Build a big palace",
                ],
                correct: "Serve his people",
                symbol: "👑",
            },
            {
                question: "Which Adinkra symbol represents good governance and strong leadership?",
                options: ["Aban", "Akoma", "Aya", "Bese Saka"],
                correct: "Aban",
                symbol: "🏛️",
            },
            {
                question: "How did Ananse defeat the lion?",
                options: [
                    "He fought him directly",
                    "He led him into a muddy swamp",
                    "He asked Nyame for help",
                    "He used a magic web",
                ],
                correct: "He led him into a muddy swamp",
                symbol: "🕷️",
            },
            {
                question: "Which symbol means unity of purpose — what the animals showed?",
                options: ["Funtunfunefu Denkyemfunefu", "Nkyinkyim", "Dwennimmen", "Nyansapo"],
                correct: "Funtunfunefu Denkyemfunefu",
                symbol: "🐊",
            },
        ],
    },
    {
        id: 9,
        title: "The Girl Who Planted Stars",
        story:
            "A young girl named Akua was sad because her village had no light at night and people were afraid of the dark. She climbed the tallest hill every evening and scattered seeds into the sky. People laughed at her. But one morning the seeds had grown into stars that lit the night sky. The elders said: 'She had faith when no one else did.' From then on, her symbol — a seed — became the sign of hope and perseverance.",
        moral: "Have faith and persevere — what seems impossible today may light the world tomorrow.",
        questions: [
            {
                question: "Why was Akua's village afraid at night?",
                options: ["Wild animals", "Enemies", "There was no light", "A curse"],
                correct: "There was no light",
                symbol: "🌑",
            },
            {
                question: "What did Akua scatter into the sky each evening?",
                options: ["Flowers", "Seeds", "Sand", "Water"],
                correct: "Seeds",
                symbol: "🌱",
            },
            {
                question: "Which Adinkra symbol represents hope and perseverance?",
                options: ["Wawa Aba", "Akoma", "Aya", "Sankofa"],
                correct: "Wawa Aba",
                symbol: "🌰",
            },
            {
                question: "What did the seeds become?",
                options: ["Trees", "Flowers", "Stars that lit the sky", "Fireflies"],
                correct: "Stars that lit the sky",
                symbol: "⭐",
            },
            {
                question: "Which symbol means endurance through hardship?",
                options: ["Aya", "Gye Nyame", "Nkyinkyim", "Akofena"],
                correct: "Aya",
                symbol: "🌿",
            },
        ],
    },
    {
        id: 10,
        title: "Ananse's Last Lesson",
        story:
            "When Ananse grew old, his children asked: 'Father, what is the greatest thing you ever did?' Ananse smiled and said: 'I did not win because I was the strongest or fastest. I won because I never stopped learning.' He pointed to the web he had woven — each strand connected to another, like knowledge connecting all things. 'Every person you meet, every story you hear — it is all part of the web of life. Never think you know everything.'",
        moral: "Lifelong learning and humility are the greatest strengths.",
        questions: [
            {
                question: "What did Ananse say was his greatest strength?",
                options: [
                    "His web",
                    "Never stopping learning",
                    "His speed",
                    "His tricks",
                ],
                correct: "Never stopping learning",
                symbol: "📚",
            },
            {
                question: "What did Ananse's web represent in his final lesson?",
                options: [
                    "A trap for enemies",
                    "Knowledge connecting all things",
                    "His home",
                    "A gift for Nyame",
                ],
                correct: "Knowledge connecting all things",
                symbol: "🕸️",
            },
            {
                question: "Which Adinkra symbol represents the spider's wisdom and creativity?",
                options: ["Ananse Ntontan", "Nyansapo", "Aya", "Akoma"],
                correct: "Ananse Ntontan",
                symbol: "🕷️",
            },
            {
                question: "What symbol represents lifelong learning and seeking knowledge?",
                options: ["Nyansapo", "Gye Nyame", "Dwennimmen", "Bese Saka"],
                correct: "Nyansapo",
                symbol: "🧠",
            },
            {
                question: "What is the Adinkra symbol for 'I am not afraid of you' — representing confidence?",
                options: ["Akofena", "Mate Masie", "Nkyinkyim", "Aban"],
                correct: "Mate Masie",
                symbol: "👂",
            },
        ],
    },
];
