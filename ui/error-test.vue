<template>
  <!--<v-container>
    <v-alert type="error">
      {{ error.message || error }}
    </v-alert>
  </v-container>-->
  <div>{{ error }}</div>
</template>

<script>
export default {
  // eslint-disable-next-line vue/require-prop-types
  props: ['error']
}
</script>

<style>

</style>
