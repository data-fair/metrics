<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    :nudge-right="40"
    transition="scale-transition"
    offset-y
    min-width="auto"
  >
    <template #activator="{ on, attrs }">
      <v-text-field
        :value="value && $day(value).format('L')"
        :label="label"
        readonly
        v-bind="attrs"
        style="max-width: 150px;"
        hide-details
        outlined
        dense
        class="mr-4 mt-2"
        v-on="on"
      />
    </template>
    <v-date-picker
      :value="value"
      @input="v => {menu = false; $emit('input', v)}"
    />
  </v-menu>
</template>

<script>
export default {
  props: {
    label: { type: String, required: true },
    value: { type: String, default: null }
  },
  data () {
    return { menu: false }
  }
}
</script>

<style>

</style>
