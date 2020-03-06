<template>
  <div>
    <h1>{{title}}</h1>
    <hr>
    <game-board></game-board>
  </div>
</template>

<script>
  import GameBoard from "./GameBoard";
  export default {
    components: {'game-board': GameBoard},
    data () {
      return {
        title: 'Cool Game'
      };
    }
  }
</script>

<style lang="scss" scoped>
  h1{
    text-align: center;
  }
</style>
