# UniversalBoardDrawer
A userscript library for seamlessly adding chess move arrows to game boards on popular platforms like Chess.com and Lichess.org. Enhance your chess-playing experience by easily customizing and displaying move arrows, improving gameplay clarity and strategic analysis.

## Installation

To use UniversalBoardDrawer in your userscript, you need to add the following line to the userscript header

```js
// @require     https://raw.githubusercontent.com/Hakorr/CommLink/main/CommLink.js
```

## Usage

### Constructor
```javascript
const BoardDrawer = new UniversalBoardDrawer(boardElem, boardDimensions, playerColor, debugMode);
```

- `boardElem` (HTMLElement): The board element on which the shapes will be drawn.
- `boardDimensions` (Array): An array containing the dimensions of the board, represented as `[rows, columns]`.
- `playerColor` (String): The color assigned to the player.
- `debugMode` (Boolean): A flag indicating whether to enable debug mode.

### Methods

#### `createShape(shapeType, coordinates, config)`
This method creates a shape on the board with the specified configuration.

- `shapeType` (String): The type of shape to create. Currently, only `'arrow'` is supported.
- `coordinates` (Array): An array with two fen position strings representing the start and end positions.
- `coordinates` (Object, optional): An object containing additional configuration options for the shape.

##### Arrow Configuration Options
- `lineWidth` (Number): The width of the arrow line.
- `arrowheadWidth` (Number): The width of the arrowhead.
- `arrowheadHeight` (Number): The height of the arrowhead.
- `startOffset` (Number): The offset of the arrow start position.
- `style` (String): Additional CSS style for the shape element.

##### Returns:
An HTMLElement representing the created shape.

#### `terminate()`
This method terminates the `UniversalBoardDrawer` instance by removing all elements and cleaning up resources.

## Example Usage

```javascript
function load(boardElem) {
    const BoardDrawer = new UniversalBoardDrawer(boardElem, [8, 8], 'w', false);

    const defaultArrowElem = BoardDrawer.createShape('arrow', ['h1', 'h6']);

    const bigArrowElem = BoardDrawer.createShape('arrow', ['d2', 'f6'], {
        lineWidth: 25,
        arrowheadWidth: 75,
        arrowheadHeight: 55,
        startOffset: 25,
        style: `fill: crimson; opacity: 1;`
    });

    const blueArrow = BoardDrawer.createShape('arrow', ['a1', 'a3'], { style: `fill: dodgerblue; opacity: 0.5;` });

    setTimeout(() => blueArrow.remove(), 5000);

    setTimeout(() => BoardDrawer.terminate(), 10000);
}

const observer = new MutationObserver((mutationsList, observer) => {
    const boardElem = document.querySelector('cg-board');

    if (boardElem) {
        observer.disconnect();
        load(boardElem); // ran once the board element exists and is ready
    }
});

observer.observe(document, { childList: true, subtree: true });
```
