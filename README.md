# CSS Merger

A simple, browser-based tool for merging CSS files while intelligently handling overlapping styles and removing duplicates.

## Features

- Merge new CSS into existing CSS, with new styles taking precedence
- Automatically combine selectors with the same name
- Remove duplicate and overlapping CSS properties
- Client-side processing (no server required)
- Saves your work using localStorage
- Clean, minimal interface

## How It Works

CSS Merger parses your CSS files into structured objects and then intelligently merges them following these rules:

1. All selectors from both files are preserved
2. When the same selector exists in both files, all properties are kept with new CSS taking precedence
3. Duplicate properties within selectors are eliminated
4. The output is formatted with consistent spacing and indentation

## Usage

1. Paste your old/existing CSS in the first textarea
2. Paste your new CSS in the second textarea
3. Click "Merge CSS"
4. Copy the merged result from the output box

Your inputs and the result are automatically saved to localStorage, so you won't lose your work if you refresh the page.

## Implementation Details

The CSS merger works by:

1. Parsing CSS into JavaScript objects where each selector contains a map of properties
2. Deep-cloning the old CSS object as the base
3. Iterating through the new CSS object and applying its properties on top of the old ones
4. Converting the merged object back to properly formatted CSS text

## Limitations

- Does not currently support complex CSS features like:
  - Media queries
  - CSS animations/keyframes
  - CSS variables
  - Nested selectors (as in SCSS)
  - Comments are stripped during processing

## Browser Compatibility

Works in all modern browsers with JavaScript enabled.

## License

MIT
