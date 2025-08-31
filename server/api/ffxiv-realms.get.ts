// server/api/ffxiv-realms.get.ts
import { defineEventHandler } from 'h3'

type RealmData = {
    regions: Array<{
        name: string
        datacenters: Array<{ name: string; worlds: string[] }>
    }>
}

const FALLBACK: RealmData = {
    regions: [
        { name: 'EU', datacenters: [
                { name: 'Light', worlds: ['Phoenix','Lich','Odin','Shiva','Zodiark','Twintania','Raiden','Alpha'] },
                { name: 'Chaos', worlds: ['Cerberus','Louisoix','Moogle','Omega','Ragnarok','Spriggan','Sagittarius','Phantom'] }
            ]},
        { name: 'NA', datacenters: [
                { name: 'Aether', worlds: ['Gilgamesh','Sargatanas','Midgardsormr','Adamantoise','Cactuar','Faerie','Jenova','Siren'] },
                { name: 'Primal', worlds: ['Behemoth','Excalibur','Exodus','Famfrit','Hyperion','Lamia','Leviathan','Ultros'] },
                { name: 'Crystal', worlds: ['Balmung','Brynhildr','Coeurl','Diabolos','Goblin','Malboro','Mateus','Zalera'] },
                { name: 'Dynamis', worlds: ['Halicarnassus','Maduin','Marilith','Seraph'] }
            ]},
        { name: 'JP', datacenters: [
                { name: 'Elemental', worlds: ['Aegis','Atomos','Carbuncle','Garuda','Gungnir','Kujata','Tonberry','Typhon'] },
                { name: 'Gaia', worlds: ['Alexander','Bahamut','Durandal','Fenrir','Ifrit','Ridill','Tiamat','Ultima'] },
                { name: 'Mana', worlds: ['Anima','Asura','Belias','Chocobo','Hades','Ixion','Mandragora','Pandaemonium','Shinryu','Titan'] },
                { name: 'Meteor', worlds: ['Belias','Ravana','Yojimbo','Zeromus','Ramuh','Unicorn','Valefor','Anima','Shinryu','Titan'] }
            ]},
        { name: 'OCE', datacenters: [
                { name: 'Materia', worlds: ['Bismarck','Ravana','Sephirot','Sophia','Zurvan'] }
            ]}
    ]
}

export default defineEventHandler(async () => {
    // TODO: Implement a source to fill via external source or use the fallback data.

    return FALLBACK
})