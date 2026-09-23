<script setup lang="ts">
import cardBack from '../images/card-back.jpg';
</script>

<template>
    <div class="absolute inset-0 overflow-hidden rounded-[inherit] bg-[#2a1d12]">
        <img :src="cardBack" alt="Face-down card" draggable="false" class="absolute inset-0 block size-full object-cover" />
    </div>
</template>
