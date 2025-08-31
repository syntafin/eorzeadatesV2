<script setup lang="ts">
const classes = computed(() => {
    return {
        'bg-black': true,
    }
});

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

const { data: items } = await useAsyncData('carousel-items', async () => {
    const files = await $fetch<string[]>('/api/background-images');
    return shuffle([...files]);
})
</script>

<template>
    <UApp>
        <div class="relative size-screen overflow-hidden" :class="classes">
            <UCarousel v-slot="{ item }" :items="items ?? []" class="relative size-screen overflow-hidden z-0" fade :autoplay="{ delay: 12000 }">
                <img :src="item" class="w-full h-screen object-cover" alt="Background Image Rotation" />
            </UCarousel>
            <div class="absolute inset-0 bg-fuchsia-500/25 backdrop-blur-xs"></div>
            <div class="absolute inset-0 size-screen flex justify-around items-center flex-col">
                <div></div>
                <div class="flex flex-col items-center justify-center gap-4 bg-black/50 px-12 py-4 rounded-lg">
                    <h1 class="bg-clip-text bg-gradient-to-r from-fuchsia-400 text-transparent via-pink-400 to-red-500 text-7xl font-black gradient-animate">
                        EorzeaDates
                    </h1>
                    <p class="text-white text-xl">
                        The only dating plattform you ever need, kupo!
                    </p>
                </div>
                <UModal title="Submit new Image"  :close="{ color: 'primary', variant: 'outline', class: 'rounded-full'}" :dismissible="false">
                    <UButton label="Submit new Image" color="primary" variant="solid" />

                    <template #body>
                        <div class="p-4">
                            <p>
                                You can submit new images to be shown on this homepage.<br />
                                Until I implement a proper backend, you can submit it via <a href="https://discord.gg/Gp6cRKcZtP" target="_blank" class="text-primary">Discord</a>, there is a channel called <UKbd class="inline-flex gap-x-1 items-center"><UIcon name="i-lucide-message-circle" class="size-3" />submit-request</UKbd> for that.
                            </p>
                        </div>
                    </template>
                </UModal>
            </div>
        </div>
    </UApp>
</template>

<style scoped>
@keyframes gradient-x {
    0% { background-position: 0 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
}

.gradient-animate {
    background-size: 200% 200%;
    animation: gradient-x 20s ease infinite;
}
</style>