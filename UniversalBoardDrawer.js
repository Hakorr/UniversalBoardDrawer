/* UniversalBoardDrawer.js
 - Version: 1.1.0
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
        this.terminateAfterDisappear = config?.terminateAfterDisappear || true;
        this.debugMode = config?.debugMode || false;

        this.boardSvg = null;
        this.singleSquareSize = null;

        this.addedShapes = [];
        this.squareSvgCoordinates = [];
        this.observers = [];

        this.defaultFillColor = 'mediumseagreen';
        this.defaultOpacity = 0.8;
        
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

    updateSVGDimensions() {
        const boardRect = this.boardElem.getBoundingClientRect();
        const isEmpty = Object.values(JSON.parse(JSON.stringify(boardRect))).every(val => val == 0);

        if(isEmpty && this.terminateAfterDisappear) {
            if(this.debugMode) {
                console.warn('Terminating board drawer as the board element has disappeared!\n\n'
                + 'Unexpected? Did you make sure the board was loaded before initializing board drawer?\n\n'
                + 'Boards which are still loading can completely re-append their elements, causing loss of the element variable.');
            }

            this.terminate();

            return;
        }

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

    createOverlaySVG() {
        const svg = this.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.pointerEvents = 'none';
            svg.style['z-index'] = this.zIndex;

        this.boardSvg = svg;

        this.updateSVGDimensions();

        this.parentElem.appendChild(this.boardSvg);

        const rObs = new ResizeObserver(this.updateSVGDimensions.bind(this));
        rObs.observe(this.boardElem);
        rObs.observe(this.document.body);

        this.observers.push(rObs);
    }

    terminate() {
        this.observers.forEach(observer => observer.disconnect());

        this.boardSvg?.remove();
    }
}
