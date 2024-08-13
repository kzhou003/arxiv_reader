# ArXiv Reader

ArXiv Reader is an Electron-based desktop application that helps researchers and academics discover relevant papers from arXiv.org based on their interests and preferences.

## Features

- Browse the latest papers from various scientific fields on arXiv
- Filter papers by subject areas
- Rank papers based on relevance to user-specified interests
- View paper details including title, authors, abstract, and links
- Open PDF versions of papers directly from the app

## Demo

Check out our demo video to see ArXiv Reader in action:

[Watch Demo Video](https://www.youtube.com/watch?v=7ns_ENT4y8Y)

## Installation

Download the latest version of ArXiv Reader:

- macOS: [ArXiv Reader.dmg](https://github.com/kzhou003/arxiv_reader/releases)

## Usage

1. Launch the ArXiv Reader application
2. Enter your OpenAI API key in the settings (required for paper ranking)
3. Select a topic and subjects of interest
4. Enter your specific research interests
5. Click "Search" to fetch and rank relevant papers
6. Browse through the ranked list of papers
7. Click on paper titles to view more details or open PDFs

## Development

To set up the development environment:

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the app in development mode: `npm start`
4. To build the app: `npm run make`

## Technologies Used

- Electron
- React
- Python (for arXiv scraping and paper ranking)
- OpenAI API (for relevance scoring)

## License

[MIT License](LICENSE)

## Contact

For support or queries, please contact [zhoukuan1@gmail.com]
