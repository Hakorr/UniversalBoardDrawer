/* UniversalBoardDrawer.js
 - Version: 1.2.0
 - Author: Haka
 - Description: A userscript library for seamlessly adding chess move arrows to game boards on popular platforms like Chess.com and Lichess.org
 - GitHub: https://github.com/Hakorr/UniversalBoardDrawer
*/

class UniversalBoardDrawer {
    constructor(config) {
        this.window = config?.window;
        this.document = this.window?.document;
        this.parentElem = config?.parentElem || this.document.body;

        this.boardElem = config?.boardElem;
        this.boardDimensions = { 
            'width': config?.boardDimensions?.[0] || 8,
            'height': config?.boardDimensions?.[1] || 8
        };

        this.playerColor = config?.playerColor || 'w';
        this.zIndex = config?.zIndex || 1000; // container z-index
        this.debugMode = config?.debugMode || false;

        this.boardContainerElem = null;
        this.singleSquareSize = null;

        this.addedShapes = [];
        this.squareSvgCoordinates = [];
        this.observers = [];

        this.defaultFillColor = 'mediumseagreen';
        this.defaultOpacity = 0.8;

        this.updateInterval = 100;
        
        this.terminated = false;

        if(!this.document) {
            if(this.debugMode) console.error(`Inputted document element doesn't exist!`);

            return;
        }

        if(!this.boardElem) {
            if(this.debugMode) console.error(`Inputted board element doesn't exist!`);

            return;
        }

        if(typeof this.boardDimensions != 'object') {
            if(this.debugMode) console.error(`Invalid board dimensions value, please use array! (e.g. [8, 8])`);

            return;
        }

        this.createOverlaySVG();
    }

    setPlayerColor(playerColor) {
        this.playerColor = playerColor;

        this.updateSVGDimensions();
    }

    setBoardDimensions(dimensionArr) {
        const [width, height] = dimensionArr || [8, 8];

        this.boardDimensions = { width, height };

        this.updateSVGDimensions();
    }

    createArrowBetweenPositions(from, to, config) {
        const fromCoordinateObj = this.squareSvgCoordinates.find(x => this.coordinateToFen(x.coordinates) == from);
        const toCoordinateObj = this.squareSvgCoordinates.find(x => this.coordinateToFen(x.coordinates) == to);

        if(!fromCoordinateObj || !toCoordinateObj) {
            if(this.debugMode) console.error('Coordinates', from, to, 'do not exist. Possibly out of bounds?');

            return;
        }

        const [fromX, fromY] = fromCoordinateObj?.positions;
        const [toX, toY] = toCoordinateObj?.positions;

        const distance = Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
        const angle = Math.atan2(fromY - toY, fromX - toX);

        const scale = this.singleSquareSize / 100;

        const lineWidth = (config?.lineWidth || 15) * scale;
        const arrowheadWidth = (config?.arrowheadWidth || 55) * scale;
        const arrowheadHeight = (config?.arrowheadHeight || 45) * scale;
        const startOffset = (config?.startOffset || 20) * scale;

        const arrowElem = this.document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
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
            arrowElem.style.fill = this.defaultFillColor;
            arrowElem.style.opacity = this.defaultOpacity;
            
        const style = config?.style;

        if(style) arrowElem.setAttribute('style', style);

        return arrowElem;
    }

    createDotOnSVG(x, y) {
        const dot = this.document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', x);
            dot.setAttribute('cy', y);
            dot.setAttribute('r', '1');
            dot.setAttribute('fill', 'black');

        this.addedShapes.push({ type: 'debugDot', 'element': dot });

        this.boardContainerElem.appendChild(dot);
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

            this.squareSvgCoordinates.forEach(x => this.createDotOnSVG(...x.positions));
        }

        this.addedShapes
            .filter(shapeObj => shapeObj.type != 'debugDot')
            .forEach(shapeObj => {
                const newShapeElem = this.createArrowBetweenPositions(...shapeObj.positions, shapeObj.config);

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
                    coordinates: [x + 1, y + 1],
                    positions: [squareWidth / 2 + (squareWidth * x),
                                  squareHeight / 2 + (squareHeight * y)]
                });
            }
        }
    }

    transferAttributes(fromElem, toElem) {
        [...fromElem.attributes].forEach(attr =>
            toElem.setAttribute(attr.name, attr.value));
    }

    createShape(type, positions, config) {
        if(this.terminated) {
            if(this.debugMode) console.warn('Failed to create shape! Tried to create shape after termination!');

            return false;
        }

        if(!this.boardContainerElem) {
            if(this.debugMode) console.warn(`Failed to create shape! Board SVG doesn't exist yet! (createOverlaySVG() failed?)`);

            return false;
        }

        switch(type) {
            case 'arrow':
                const element = this.createArrowBetweenPositions(...positions, config);

                if(element) {
                    this.addedShapes.push({ type, positions, config, element });

                    this.boardContainerElem.appendChild(element);

                    return element;
                }

                break;
        }

        return null;
    }

    updateSVGDimensions() {
        const boardRect = this.boardElem.getBoundingClientRect();
        const bodyRect = this.document.body.getBoundingClientRect(); // https://stackoverflow.com/a/62106310

        this.boardContainerElem.style.width = boardRect.width + 'px';
        this.boardContainerElem.style.height = boardRect.height + 'px';
        this.boardContainerElem.style.left = boardRect.left - bodyRect.left + 'px';
        this.boardContainerElem.style.top = boardRect.top - bodyRect.top + 'px';

        const squareWidth = boardRect.width / this.boardDimensions.width;
        const squareHeight = boardRect.height / this.boardDimensions.height;

        this.singleSquareSize = squareWidth;

        this.updateCoords(squareWidth, squareHeight);
        this.updateShapes();
    }

    createOverlaySVG() {
        const svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.pointerEvents = 'none';
            svg.style['z-index'] = this.zIndex;

        this.boardContainerElem = svg;

        this.updateSVGDimensions();

        this.parentElem.appendChild(this.boardContainerElem);

        const rObs = new ResizeObserver(this.updateSVGDimensions.bind(this));
            rObs.observe(this.boardElem);
            rObs.observe(this.document.body);

        this.observers.push(rObs);

        let oldBoardRect = JSON.stringify(this.boardElem.getBoundingClientRect());

        const additionalCheckLoop = setInterval(() => {
            if(this.terminated) {
                clearInterval(additionalCheckLoop);

                return;
            }

            const boardRect = JSON.stringify(this.boardElem.getBoundingClientRect());

            if(boardRect !== oldBoardRect) {
                oldBoardRect = boardRect;

                this.updateSVGDimensions();
            }
        }, this.updateInterval);
    }

    terminate() {
        this.terminated = true;

        this.observers.forEach(observer => observer.disconnect());

        this.boardContainerElem.remove();
    }
}
