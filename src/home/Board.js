import {owners} from "./utils";

class BoardColumn {
  constructor(boardWidth) {
    this.boardWidth = boardWidth;
    this.cells = [];
    this.init();
  }

  init() {
    for (let i = 0; i < this.boardWidth; i++) {
      this.cells.push({owner: owners.empty});
    }
  }
}

export class Board {
  constructor(boardWidth = 7) {
    this.boardWidth = boardWidth;
    this.columns = [];
    this.reversedColumns = [];
    this.skewedColumns = [];
    this.skewedReveresedColumns = [];
    this.init();
  }

  init() {
    // setup the columns array
    for (let i = 0; i < this.boardWidth; i++) {
      this.columns.push(new BoardColumn(this.boardWidth));
    }

    // derive the reversed vaiant form columns
    this.reversedColumns = this.columns.slice().reverse();
    this.skewedColumns = this.createSkewedModel(this.columns.slice());
    this.skewedReveresedColumns = this.createSkewedModel(this.reversedColumns.slice());
  }

  createSkewedModel(arr) {
    return arr.reduce((skewed, col, colIndex) => {
      let pushIndex = colIndex;
      col.cells.forEach((cell, cellIndex) => {

        // setup of row model
        if (!skewed[pushIndex]) {
          skewed[pushIndex] = {cells: []}
        }
        skewed[pushIndex].cells.push(cell);
        pushIndex++;
      });
      return skewed;
    }, []);

  }

  validate(winningNr, player) {
    const colValidationModel = this.createColValidationModel(this.columns, player);
    const colSkewedValidationModel = this.createColValidationModel(this.skewedColumns, player);
    const colSkewedReversedValidationModel = this.createColValidationModel(this.skewedReveresedColumns, player);
    const mergedColValidationModel = []
      .concat(colValidationModel)
      .concat(colSkewedValidationModel)
      .concat(colSkewedReversedValidationModel);
    const mergedColumnSequence = [].concat.apply([], mergedColValidationModel);

    const rowValidationModel = colValidationModel.reduce((model, colValidationModelArray) => {
      colValidationModelArray.forEach((colValidationModel, index) => {
        if (!model[index]) {
          model[index] = []
        }
        model[index].push(colValidationModel);
      });
      return model;
    }, []);
    const mergedRowSequence = [].concat.apply([], rowValidationModel);

    const colHasWin = this.hasWin(mergedColumnSequence, winningNr, player);
    const rowHasWin = this.hasWin(mergedRowSequence, winningNr, player, false);

    return colHasWin || rowHasWin;
  }

  createColValidationModel(columns, player) {
    return columns.map(col => {
      return col.cells.map((cell, index) => {
        // return cell.owner === player ? index : -1;
        return {
          index: cell.owner === player ? index : -1,
          cell: cell
        };
      });
    });
  }

  hasWin(arr, winningNr, player, col = true) {
    // when checking a row
    // if winning number is 3 then 3 times the same number in the array following each other
    // in the array indicates a win on a row, for example: 0, 0, 0 or 3,3,3
    // then those cells should be changed to the WIN state
    if (col) {
      arr = arr.reverse();
    }
    let winCounter = 0;
    const winnerCells = [];
    for (let i = 0; i < arr.length - 2; i++) {
      // row check: current minus next is 0
      const notMinusOne = arr[i].index !== -1 && arr[i + 1].index !== -1;
      const condition = col ? (arr[i].index - arr[i + 1].index) === 1 : (arr[i].index - arr[i + 1].index) === 0;
      if (notMinusOne && condition) {
        winCounter++;
        winnerCells.push(arr[i].cell);
      } else {
        winCounter = 0;
        winnerCells.length = 0;
      }
      if (winCounter === winningNr - 1) {
        winnerCells.push(arr[i + 1].cell);
        winnerCells.forEach(cell => cell.owner = `${owners.win} ${player}`);
        return true;
      }
    }
    return false;
  }
}
