/* UniversalBoardDrawer.js
 - Version: 1.0.0
 - Author: Haka
 - Description: A userscript library for seamlessly adding chess move arrows to game boards on popular platforms like Chess.com and Lichess.org
 - GitHub: https://github.com/Hakorr/UniversalBoardDrawer
 */

class UniversalBoardDrawer {
    constructor(boardElem, boardDimensions, playerColor, debugMode) {
        this.boardElem = boardElem;

        this.boardDimensions = { 'width': boardDimensions?.[0] || 8, 'height': boardDimensions?.[1] || 8 };
        this.playerColor = playerColor || 'w';

        this.boardSvg = null;
        this.singleSquareSize = null;

        this.addedShapes = [];
        this.squareSvgCoordinates = [];
        this.observers = [];

        this.defaultFillColor = 'mediumseagreen';
        this.defaultOpacity = 0.8;

        this.debugMode = debugMode || false;
        this.terminated = false;

        if(!this.boardElem) {
            if(this.debugMode) console.error(`Board element doesn't exist!`);

            return;
        }

        if(typeof this.boardDimensions != 'object') {
            if(this.debugMode) console.error(`Invalid board dimensions value, please use array!`);

            return;
        }

        this.createOverlaySVG();
    }

    createArrowBetweenPositions(from, to, config) {
        const fromCoordinateObj = this.squareSvgCoordinates.find(x => x.fenSquare == from);
        const toCoordinateObj = this.squareSvgCoordinates.find(x => x.fenSquare == to);

        if(!fromCoordinateObj || !toCoordinateObj) {
            if(this.debugMode) console.error('Coordinates', from, to, 'do not exist. Possibly out of bounds?');

            return;
        }

        const [fromX, fromY] = fromCoordinateObj?.coordinates;
        const [toX, toY] = toCoordinateObj?.coordinates;

        const distance = Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
        const angle = Math.atan2(fromY - toY, fromX - toX);

        const scale = this.singleSquareSize / 100;

        const lineWidth = (config?.lineWidth || 15) * scale;
        const arrowheadWidth = (config?.arrowheadWidth || 55) * scale;
        const arrowheadHeight = (config?.arrowheadHeight || 45) * scale;
        const startOffset = (config?.startOffset || 20) * scale;

        const style = config?.style || `fill: ${this.defaultFillColor}; opacity: ${this.defaultOpacity}`;

        const arrowElem = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            arrowElem.setAttribute('transform', `rotate(${angle * (180 / Math.PI) - 90} ${fromX} ${fromY})`);

        const arrowPoints = [
            { x: fromX - lineWidth / 2, y: fromY - startOffset },
            { x: fromX - lineWidth / 2, y: fromY - distance + arrowheadHeight },
            { x: fromX - arrowheadWidth / 2, y: fromY - distance + arrowheadHeight },
            { x: fromX, y: fromY - distance },
            { x: fromX + arrowheadWidth / 2, y: fromY - distance + arrowheadHeight },
            { x: fromX + lineWidth / 2, y: fromY - distance + arrowheadHeight },
            { x: fromX + lineWidth / 2, y: fromY - startOffset }
        ];

        const pointsString = arrowPoints.map(point => `${point.x},${point.y}`).join(' ');
            arrowElem.setAttribute('points', pointsString);
            arrowElem.setAttribute('style', style);

        return arrowElem;
    }

    createDotOnSVG(x, y) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', '1');
            dot.setAttribute('fill', 'black');

        this.addedShapes.push({ type: 'debugDot', 'element': dot });

        this.boardSvg.appendChild(dot);
    }

    removeAllExistingShapes() {
        this.addedShapes
            .forEach(shapeObj => {
                shapeObj.element?.remove();
            });
    }

    removeAllDebugDots() {
        this.addedShapes
            .filter(shapeObj => shapeObj.type == 'debugDot')
            .forEach(debugDotObj => {
                debugDotObj.element?.remove();
            });
    }

    updateShapes() {
        if(this.debugMode) {
            this.removeAllDebugDots();

            this.squareSvgCoordinates.forEach(x => this.createDotOnSVG(...x.coordinates));
        }

        this.addedShapes
            .filter(shapeObj => shapeObj.type != 'debugDot')
            .forEach(shapeObj => {
                const newShapeElem = this.createArrowBetweenPositions(...shapeObj.coordinates, shapeObj.config);

                this.transferAttributes(newShapeElem, shapeObj.element);
            });
    }

    coordinateToFen(coordinates) {
        let [x, y] = coordinates;

        x = this.playerColor == 'w' ? x : this.boardDimensions.width - x + 1;
        y = this.playerColor == 'b' ? y : this.boardDimensions.height - y + 1;

        const getCharacter = num => String.fromCharCode(96 + num);

        const file = getCharacter(x);
        const rank = y;

        return file + rank;
    }

    updateCoords(squareWidth, squareHeight) {
        this.squareSvgCoordinates = []; // reset coordinate array

        // calculate every square center point coordinates relative to the svg
        for(let y = 0; this.boardDimensions.height > y; y++) {
            for(let x = 0; this.boardDimensions.width > x; x++) {
                this.squareSvgCoordinates.push({
                    fenSquare: this.coordinateToFen([x + 1, y + 1]),
                    coordinates: [squareWidth / 2 + (squareWidth * x),
                                  squareHeight / 2 + (squareHeight * y)]
                });
            }
        }
    }

    transferAttributes(fromElem, toElem) {
        [...fromElem.attributes].forEach(attr =>
            toElem.setAttribute(attr.name, attr.value));
    }

    updateSVGDimensions() {
        const boardRect = this.boardElem.getBoundingClientRect();

        this.boardSvg.style.width = boardRect.width + 'px';
        this.boardSvg.style.height = boardRect.height + 'px';
        this.boardSvg.style.left = boardRect.left + 'px';
        this.boardSvg.style.top = boardRect.top + 'px';

        const squareWidth = boardRect.width / this.boardDimensions.width;
        const squareHeight = boardRect.height / this.boardDimensions.height;

        this.singleSquareSize = squareWidth;

        this.updateCoords(squareWidth, squareHeight);
        this.updateShapes();
    }

    createShape(type, coordinates, config) {
        if(this.terminated) {
            if(this.debugMode) console.warn('Failed to create shape! Tried to create shape after termination!');

            return false;
        }

        if(!this.boardSvg) {
            if(this.debugMode) console.warn(`Failed to create shape! Board SVG doesn't exist yet! (createOverlaySVG() failed?)`);

            return false;
        }

        switch(type) {
            case 'arrow':
                const element = this.createArrowBetweenPositions(...coordinates, config);

                if(element) {
                    this.addedShapes.push({ type, coordinates, config, element });

                    this.boardSvg.appendChild(element);

                    return element;
                }

                break;
        }

        return null;
    }

    createOverlaySVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'sticky';
            svg.style.pointerEvents = 'none';
            svg.style['z-index'] = 5;

        this.boardSvg = svg;

        this.updateSVGDimensions();

        this.boardElem.appendChild(this.boardSvg);

        const rObs = new ResizeObserver(this.updateSVGDimensions.bind(this));

        rObs.observe(this.boardElem);

        this.observers.push(rObs);
    }

    terminate() {
        this.observers.forEach(observer => observer.disconnect());

        this.boardSvg?.remove();
    }
}
