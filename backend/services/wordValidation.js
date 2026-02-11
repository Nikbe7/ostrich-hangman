const fs = require('fs');
const path = require('path');

let wordList = new Set();

const loadWords = () => {
    try {
        const filePath = path.join(__dirname, 'swedish_words.txt');
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            // Split by newline and add to Set for O(1) lookup
            data.split(/\r?\n/).forEach(word => {
                const cleanWord = word.trim().toLowerCase();
                if (cleanWord) {
                    wordList.add(cleanWord);
                }
            });
            console.log(`Loaded ${wordList.size} Swedish words.`);
        } else {
            console.warn("Word list file not found. Validation will fall back to basic length check.");
            // Add some default words for testing if file is missing
            ['ostrich', 'hangman', 'svenska', 'spel', 'dator'].forEach(w => wordList.add(w));
        }
    } catch (err) {
        console.error("Error loading word list:", err);
    }
};

// Validates if a word is capable of being guessed
const isValidWord = (word) => {
    if (!word) return false;
    const cleanWord = word.trim().toLowerCase();

    // Check 1: Length (e.g., at least 2 chars)
    if (cleanWord.length < 2) return false;

    // Check 2: Alphabet (Swedish only)
    if (!/^[a-zåäö]+$/.test(cleanWord)) return false;

    // Check 3: Dictionary Lookup
    // If the list is empty (failed load), we might want to fail open or closed. 
    // Here we fail open if list is essentially empty (only defaults), otherwise strict.
    if (wordList.size > 10) {
        return wordList.has(cleanWord);
    }

    return true; // Fallback if no list
};

// Initialize
loadWords();

module.exports = {
    isValidWord
};
