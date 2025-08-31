<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";

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
});

const isMobile = ref(false);
const discordInviteUrl = 'https://discord.gg/Gp6cRKcZtP';
const discordAppUrl = 'discord://-/invite/Gp6cRKcZtP';

onMounted(() => {
    const ua = navigator.userAgent || '';
    isMobile.value = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
});

function openDiscordInvite() {
    if (isMobile.value) {
        window.open(discordInviteUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    let didNavigate = false;

    const timer = setTimeout(() => {
        if (!didNavigate) {
            window.open(discordInviteUrl, '_blank', 'noopener,noreferrer');
        }
    }, 1200);

    try {
        (window.location as any).href = discordAppUrl;
        didNavigate = true;
        setTimeout(() => clearTimeout(timer), 1500);
    } catch {
        clearTimeout(timer);
        window.open(discordInviteUrl, '_blank', 'noopener,noreferrer');
    }
}

type FormState = {
    name: string,
    world: string | null,
    datacenter: string | null,
    image: File | null
};

const form = reactive<FormState>({
    name: '',
    world: null,
    datacenter: null,
    image: null
});

function resetForm() {
    form.name = '';
    form.world = null;
    form.datacenter = null;
    form.image = null;
    errors.name = '';
    errors.world = '';
    errors.datacenter = '';
    errors.image = '';
    successMessage.value = '';
    const fileInput = document.getElementById('image-input') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
}

type RealmData = {
    regions: Array<{
        name: string,
        datacenters: Array<{
            name: string,
            worlds: string[]
        }>
    }>
};

const REALM_LS_KEY = 'realm-data-v1';
const REALM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const { data: realms, pending: realmsPending, error: realmsError } = await useAsyncData('realms-data', async () => {
    try {
        const raw = localStorage.getItem(REALM_LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as { ts: number; payload: RealmData };
            if (parsed?.ts && parsed?.payload && (Date.now() - parsed.ts < REALM_TTL_MS)) {
                return parsed.payload;
            }
        }
    } catch {
        // Ignore and get new data
    }

    const payload = await $fetch<RealmData>('/api/ffxiv-realms', { timeout: 10000 });
    try {
        localStorage.setItem(REALM_LS_KEY, JSON.stringify({ ts: Date.now(), payload }));
    } catch {
        // Skip cache
    }

    return payload;
}, { server: false });

const allDatacenters = computed(() => {
    const seen = new Set<string>();
    const regions = realms.value?.regions ?? [];
    regions.forEach((region) => {
        (region.datacenters ?? []).forEach((datacenter) => {
            if (datacenter?.name) seen.add(datacenter.name);
        });
    });
    return Array.from(seen).sort();
});

const dcToWorlds = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    const regions = realms.value?.regions ?? [];
    regions.forEach((region) => {
        (region.datacenters ?? []).forEach((dc) => {
            const dcName = dc?.name;
            if (dcName) map[dcName] = [...(dc.worlds ?? [])].sort();
        });
    });
    return map;
});

const worldToDC = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const regions = realms.value?.regions ?? [];
    regions.forEach((region) => {
        (region.datacenters ?? []).forEach((datacenter) => {
            const dcName = datacenter?.name;
            (datacenter?.worlds ?? []).forEach((world) => {
                if (world && dcName) map[world] = dcName;
            });
        });
    });
    return map;
});

const datacenterOptions = computed(() =>
    allDatacenters.value.map(dc => ({ label: dc, value: dc }))
);

const worldOptionsAll = computed(() => {
    const allWorlds = new Set<string>();
    Object.values(dcToWorlds.value).forEach(worlds => worlds.forEach(w => allWorlds.add(w)));
    return Array.from(allWorlds).sort().map(w => ({ label: w, value: w }));
});

const filteredWorldOptions = computed(() => {
    const raw = form.datacenter as any;
    const dc = typeof raw === 'string' ? raw : raw?.value || '';
    if (dc && dcToWorlds.value[dc]?.length) {
        return dcToWorlds.value[dc].map(w => ({ label: w, value: w }));
    }

    return worldOptionsAll.value;
});

const filteredDatacenterOptions = computed(() => {
    const world = form.world;
    const dc = world ? worldToDC.value[world] : '';
    if (dc) return [{ label: dc, value: dc }];
    return datacenterOptions.value;
});

watch(() => form.datacenter, (newDc, oldDc) => {
    const dc = typeof (newDc as any) === 'string' ? (newDc as any) : (newDc as any)?.value || '';
    if (dc !== (typeof (oldDc as any) === 'string' ? (oldDc as any) : (oldDc as any)?.value || '')) {
        if (form.world && !(dcToWorlds.value[dc] ?? []).includes(form.world)) {
            form.world = null;
        }
    }
});

watch(() => form.world, (newWorld) => {
    if (newWorld) {
        const dc = worldToDC.value[newWorld];
        if (dc && dc !== form.datacenter) form.datacenter = dc;
    }
});

const errors = reactive<Record<keyof FormState, string>>({
    name: '',
    world: '',
    datacenter: '',
    image: null as unknown as string
});

const submitting = ref(false);
const successMessage = ref<string>('');

function validate(): boolean {
    let ok = true;
    errors.name = '';
    errors.world = '';
    errors.datacenter = '';
    errors.image = '';

    if (!form.name.trim()) {
        errors.name = 'Your name is required';
        ok = false;
    }
    if (!form.image) {
        errors.image = 'Please select a Image';
        ok = false;
    } else {
        const allowed = ['image/png', 'image/jpeg', 'image/webp'];
        if (!allowed.includes(form.image.type)) {
            errors.image = 'Allowed formats: PNG, JPEG/JPG and WebP';
            ok = false;
        }

        const maxMB = 8;
        if (form.image.size > maxMB * 1024 *1024) {
            errors.image = `Image filesize is to big, max ${maxMB}mb are allowed`;
            ok = false;
        }
    }

    return ok;
}

function normalizeSelectValue(v: unknown): string {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
        const any = v as any;
        return (typeof any.value === 'string' && any.value) || (typeof any.label === 'string' && any.label) || '';
    }
    return '';
}

async function onSubmit() {
    successMessage.value = '';

    if (!validate()) return;
    submitting.value = true;

    try {
        const fd = new FormData();
        fd.append('name', form.name)

        const worldStr = normalizeSelectValue(form.world as any);
        const dcStr = normalizeSelectValue(form.datacenter as any);

        if (worldStr) fd.append('world', worldStr);
        if (dcStr) fd.append('datacenter', dcStr);
        if (form.image) fd.append('image', form.image, form.image.name);

        await $fetch('/api/submit', {
            method: 'POST',
            body: fd
        });

        successMessage.value = 'Thank you! Your image got submitted, you can check the status via Discord!';

        form.name = '';
        form.world = null;
        form.datacenter = null;
        form.image = null;

        const fileInput = document.getElementById('image-input') as HTMLInputElement | null;
        if (fileInput) fileInput.value = '';
    } catch (e: any) {
        const msg = e?.data?.message || e?.message || 'Unknown error while validating your request.';
        errors.image = msg;
    } finally {
        submitting.value = false;
    }
}

const modalOpen = ref(false);

watch(modalOpen, (open) => {
    if (!open) resetForm();
});

</script>

<template>
    <UApp>
        <div class="relative size-screen overflow-hidden">
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
                <UModal title="Submit new Image" v-model="modalOpen" @update:open="(v)=>{ modalOpen = v; if (!v) resetForm(); }" :close="{ color: 'primary', variant: 'outline', class: 'rounded-full'}" :dismissible="false">
                    <UButton label="Submit new Image" color="primary" variant="solid" />

                    <template #body>
                        <div class="p-4">
                            <p class="text-xs text-gray-300 mb-4">
                                Fill out this form or submit your request directly via <a href="#" @click.prevent="openDiscordInvite" class="text-primary underline">Discord</a> in the channel <UKbd class="inline-flex gap-x-1 items-center"><UIcon name="i-lucide-message-circle" class="size-3" />submit-request</UKbd>.
                            </p>
                            <form @submit.prevent="onSubmit" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-white mb-1" for="name">Name<span class="text-red-400">*</span></label>
                                    <UInput id="name" v-model="form.name" placeholder="Your Name" class="w-full" />
                                    <p v-if="errors.name" class="text-red-400 text-sm mt-1">{{ errors.name }}</p>
                                </div>

                                <div class="flex gap-2">
                                    <div class="w-full sm:w-1/2">
                                        <label class="block text-sm font-medium text-white mb-1" for="datacenter">Datacenter <span class="text-xs text-gray-400">optional</span></label>
                                        <USelectMenu
                                                id="datacenter"
                                                v-model="form.datacenter"
                                                :items="datacenterOptions"
                                                option-attribute="label"
                                                value-attribute="value"
                                                by="value"
                                                placeholder="Select Datacenter"
                                                searchable
                                                searchable-placeholder="Search for Datacenter…"
                                                clearable
                                                class="w-full"
                                                :ui="{ trigger: 'h-10 py-2 px-3', placeholder: 'text-gray-400' }"
                                                :loading="realmsPending"
                                                :disabled="!!realmsError"
                                                @update:model-value="v => form.datacenter = v || null"
                                        />

                                        <p v-if="errors.datacenter" class="text-red-400 text-sm mt-1">{{ errors.datacenter }}</p>
                                    </div>
                                    <div class="w-full sm:w-1/2">
                                        <label class="block text-sm font-medium text-white mb-1" for="world">World <span class="text-xs text-gray-400">optional</span></label>
                                        <USelectMenu
                                                id="world"
                                                v-model="form.world"
                                                :items="filteredWorldOptions"
                                                option-attribute="label"
                                                value-attribute="value"
                                                by="value"
                                                placeholder="Select World"
                                                searchable
                                                searchable-placeholder="Search for a World…"
                                                clearable
                                                class="w-full"
                                                :ui="{ trigger: 'h-10 py-2 px-3', placeholder: 'text-gray-400' }"
                                                :loading="realmsPending"
                                                :disabled="!!realmsError || !filteredWorldOptions.length"
                                                @update:model-value="v => form.world = v || null"
                                        />

                                        <p v-if="errors.world" class="text-red-400 text-sm mt-1">{{ errors.world }}</p>
                                    </div>

                                </div>

                                <div>
                                    <label class="block text-sm font-medium text-white mb-1" for="image-input">Image<span class="text-red-400">*</span></label>
                                    <UInput class="w-full" id="image-input" type="file" accept="image/png,image/jpeg,image/webp"
                                            @change="(e:any)=>{ const f=e?.target?.files?.[0]; form.image=f||null; }" />
                                    <p class="text-xs text-gray-300 mt-1">Allowed: PNG, JPEG/JPG, WebP. Max. 8 MB.</p>
                                    <p v-if="errors.image" class="text-red-400 text-sm mt-1">{{ errors.image }}</p>
                                </div>

                                <div class="flex items-center justify-end gap-2">
                                    <span v-if="successMessage" class="text-green-400 text-sm">{{ successMessage }}</span>
                                    <UButton type="submit" color="primary" :loading="submitting">Submit</UButton>
                                </div>
                            </form>
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