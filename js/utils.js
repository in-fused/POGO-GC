let pokemonIdMap = {};

async function loadPokemonData() {
    try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
        const data = await res.json();
        pokemonIdMap = {};
        data.results.forEach(p => {
            const id = p.url.split('/')[6];
            pokemonIdMap[p.name] = parseInt(id);
        });
    } catch (e) {
        pokemonIdMap = { pikachu:25, charmander:4, bulbasaur:1, squirtle:7, kyogre:382, rayquaza:384 };
    }
}

function getPokemonId(name) {
    if (!name) return 25;
    return pokemonIdMap[name.toLowerCase().trim()] || 25;
}