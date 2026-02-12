const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../../data/quotes.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

exports.getQuotes = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading DB:', error);
        return [];
    }
};

exports.saveQuote = (quote) => {
    const quotes = exports.getQuotes();
    quotes.push(quote);
    exports.writeQuotes(quotes);
    return quote;
};

exports.updateQuote = (updatedQuote) => {
    const quotes = exports.getQuotes();
    const index = quotes.findIndex(q => q.id === updatedQuote.id);
    if (index !== -1) {
        quotes[index] = updatedQuote;
        exports.writeQuotes(quotes);
        return updatedQuote;
    }
    return null;
};

exports.writeQuotes = (quotes) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(quotes, null, 2));
    } catch (error) {
        console.error('Error writing DB:', error);
    }
};
