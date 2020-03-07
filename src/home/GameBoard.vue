<template>
  <div class="component-cnt">
    <div class="game-board">
      <div class="board-overlay" v-show="freeze || !started"></div>
      <div class="board-column"
           v-for="(column, index) in board.columns"
           :key="index"
           ref="column"
           @click="act(column, index)">
        <div class="chippi"></div>
        <div class="board-cell" v-for="cell in column.cells" :class="cell.owner.toLowerCase()">
          <div class="inner-cell"></div>
        </div>
      </div>
    </div>
    <div class="toolbar">
      <button class="btn btn-lg btn-secondary"
              @click="reset()">{{started ? 'Restart ' : 'Start '}} Game
      </button>
      <h1 class="winphrase" v-if="winPhrase">{{winPhrase}}</h1>
      <h1 v-if="!started">Click start to begin.</h1>
    </div>
  </div>
</template>

<script>

  import {Board} from "./Board";
  import {owners} from "./utils";

  export default {
    data() {
      return {
        title: 'AON Game',
        boardWidth: 7,
        winningNr: 4,
        board: null,
        freeze: false,
        started: false,
        winPhrase: '',
      };
    },
    created() {
      this.board = new Board(this.boardWidth);
    },
    methods: {
      act(column, index) {
        const firstEmptyCell = column.cells.find(cell => cell.owner === owners.empty);
        if (firstEmptyCell) {
          this.animate(index, firstEmptyCell);
          this.freeze = true;
          firstEmptyCell.owner = owners.mine;
          // Validate
          this.validate(owners.mine).then(win => {
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
            return this.validate(owners.opponent)
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
            const firstEmptyCell = reactColumn.cells.find(cell => cell.owner === owners.empty);

            if (firstEmptyCell) {
              firstEmptyCell.owner = owners.opponent;
            } else {
              // If there is no empty cell then
              // find all the columns that have an empty slot
              // Just pick a random one to fill up
              const availableColumnIndexes = board.columns
                .map((col, colIndex) => {
                  const cellIndex = col.cells
                    .findIndex(cell => cell.owner === owners.empty);
                  return cellIndex !== -1 ? colIndex : -1;
                })
                .filter(item => item !== -1);

              if (availableColumnIndexes.length > 0) {
                const randomIndex = fn(0, availableColumnIndexes.length - 1);
                const chosenColumnIndex = availableColumnIndexes[randomIndex];
                const firstEmptyCell = board.columns[chosenColumnIndex].cells
                  .find(cell => cell.owner === owners.empty);
                firstEmptyCell.owner = owners.opponent;
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
      },
      animate(colIndex, firstEmptyCell) {
        this.$refs.column[colIndex].classList.add('animate');
        setTimeout(() => {
          this.$refs.column[colIndex].classList.remove('animate');
        }, 250);
      }
    }
  }

</script>

<style lang="scss" scoped>
  @import "~styles/index.scss";

  $dimension: 48px;
  $animation-duration: 300ms;
  .component-cnt {
    text-align: center;


    .game-board {
      margin-top: 56px;
      display: inline-flex;
      flex-wrap: nowrap;
      position: relative;
      border-radius: 8px;

      .board-overlay {
        z-index: 10;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0);

        .winphrase {
          text-align: center;
          color: white;
        }
      }

      .board-column {
        position: relative;
        display: flex;
        flex-direction: column-reverse;
        cursor: pointer;
        transition: all 0.3s;

        .board-cell {
          display: flex;
          width: $dimension;
          height: $dimension;
          padding: 8px;

          .inner-cell {
            z-index: 2;
            transition: all 0.5s;
            background-color: transparent;
            border: 3px solid white;
            width: 100%;
            border-radius: 50%;
          }

          &.mine .inner-cell {
            background-color: $blue;
          }

          &.win.mine .inner-cell {
            background-color: $green;
          }

          &.opponent .inner-cell {
            background-color: $orange;
          }

          &.win.opponent .inner-cell {
            background-color: $yellow;
          }

        }

        .chippi {
          z-index: 1;
          position: absolute;
          top: -40px;
          left: 8px;
          width: 32px;
          height: 32px;
          background-color: $blue;
          border-radius: 50%;
          transition: all $animation-duration;
          display: none;

          @keyframes chippifalls {
            80% {
              background-color: $blue;
            }
            100% {
              top: calc(100% - 48px - 8px);
              background-color: transparent;
              display: none;
            }
          }
        }

        &.animate {
          .chippi {
            display: block;
            animation-name: chippifalls;
            animation-duration: $animation-duration;
            animation-timing-function: ease-out;
          }
        }

        &:hover {
          &:not(.animate) {
            .board-cell:not(.mine):not(.opponent) .inner-cell {
              background-color: white;
            }
          }

          .chippi {
            display: block;
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

    .toolbar {
      margin: 32px 0;
      text-align: center;
    }

  }
</style>
