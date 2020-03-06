<template>
  <div class="component-cnt">
    <div class="toolbar">
      <button @click="reset()">{{started ? 'Restart ' : 'Start '}} Game</button>
    </div>
    <div class="game-board">
      <div class="board-overlay" v-show="freeze || !started">
        <h4 class="winphrase" v-if="winPhrase">{{winPhrase}}</h4>
      </div>
      <div class="board-column" v-for="(column, index) in board.columns" @click="act(column, index)">
        <div class="board-cell" v-for="cell in column.cells" :class="cell.owner.toLowerCase()">
          <div class="overlay"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

  const ownerOptions = {
    mine: 'MINE',
    opponent: 'OPPONENT',
    empty: 'EMPTY',
    win: 'WIN',
  };

  class BoardColumn {
    constructor(boardWidth) {
      this.boardWidth = boardWidth;
      this.cells = [];
      this.init();
    }

    init() {
      for (let i = 0; i < this.boardWidth; i++) {
        this.cells.push({owner: ownerOptions.empty});
      }
    }
  }

  class Board {
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
          winnerCells.forEach(cell => cell.owner = `${ownerOptions.win} ${player}`);
          return true;
        }
      }
      return false;
    }
  }

  export default {
    data() {
      return {
        title: 'AON Game',
        boardWidth: 7,
        winningNr: 4,
        board: null,
        freeze: false,
        started: false,
        winPhrase: ''
      };
    },
    created() {
      this.board = new Board(this.boardWidth);
    },
    methods: {
      act(column, index) {
        const firstEmptyCell = column.cells.find(cell => cell.owner === ownerOptions.empty);
        if (firstEmptyCell) {
          firstEmptyCell.owner = ownerOptions.mine;
          this.freeze = true;
          // Validate
          this.validate(ownerOptions.mine).then(win => {
            if (!win) {
              this.react(column, index);
            } else {
              this.winPhrase = 'You win!';
            }
          });
        }
      },
      react(actedColumn, actedIndex) {
        // Freeze the screen
        this.serverSideReact(this.board, actedColumn, actedIndex)
          .then(board => {
            this.board = board;
            return this.validate(ownerOptions.opponent)
          })
          .then((win) => {
            this.freeze = win;
            this.winPhrase = win ? 'You Lose!' : '';
          });
      },
      serverSideReact(board, actedColumn, actedIndex) {
        return new Promise(resolve => {
          setTimeout(() => {
            const fn = (min, max) => {
              return Math.round(Math.random() * (max - min) + min)
            };

            // select a column to react based on the column thats acted upon
            // always same column or one to the side
            let reactIndex = fn(actedIndex - 1, actedIndex + 1);
            reactIndex = reactIndex < 0 ? 0 : reactIndex;
            reactIndex = reactIndex > board.boardWidth - 1 ? board.boardWidth - 1 : reactIndex;
            const reactColumn = board.columns[reactIndex];
            const firstEmptyCell = reactColumn.cells.find(cell => cell.owner === ownerOptions.empty);

            if (firstEmptyCell) {
              firstEmptyCell.owner = ownerOptions.opponent;
            } else {
              // If there is no empty cell then
              // find all the columns that have an empty slot
              // Just pick a random one to fill up
              const availableColumnIndexes = board.columns
                .map((col, colIndex) => {
                  const cellIndex = col.cells
                    .findIndex(cell => cell.owner === ownerOptions.empty);
                  return cellIndex !== -1 ? colIndex : -1;
                })
                .filter(item => item !== -1);

              if (availableColumnIndexes.length > 0) {
                const randomIndex = fn(0, availableColumnIndexes.length - 1);
                const chosenColumnIndex = availableColumnIndexes[randomIndex];
                const firstEmptyCell = board.columns[chosenColumnIndex].cells
                  .find(cell => cell.owner === ownerOptions.empty);
                firstEmptyCell.owner = ownerOptions.opponent;
              }
            }
            resolve(board);
          }, 1000);
        });


      },
      validate(player) {
        return new Promise((resolve, reject) => {
          resolve(this.board.validate(this.winningNr, player));
        });
      },
      reset() {
        this.started = true;
        this.board = new Board(this.boardWidth);
        this.freeze = false;
        this.winPhrase = '';
      }
    }
  }

</script>

<style lang="scss" scoped>
  .component-cnt {
    text-align: center;

    .toolbar{
      margin-bottom: 16px;
    }

    .game-board {
      display: inline-flex;
      flex-wrap: nowrap;
      position: relative;

      .board-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.1);

        .winphrase {
          text-align: center;
          color: blueviolet;
        }
      }

      .board-column {
        display: flex;
        flex-direction: column-reverse;
        cursor: pointer;
        transition: all 0.3s;

        &:hover{
          box-shadow: 0 4px 4px 2px #ccc;
          margin-right: 1px;
          margin-left: -1px;
        }

        .board-cell {
          width: 50px;
          height: 50px;
          border: 1px solid #CCCCCC;
          background-color: white;
          transition: all 0.5s;

          &.mine {
            background-color: deepskyblue;
            &.win {
              background-color: dodgerblue;
            }
          }

          &.opponent {
            background-color: palevioletred;
            &.win {
              background-color: mediumvioletred;
            }
          }

        }
      }

      &.skewed {
        flex-wrap: unset;
        flex-direction: column;

        .board-column {
          flex-direction: row;
          flex-wrap: nowrap;
          justify-content: center;
        }
      }
    }
  }
</style>
