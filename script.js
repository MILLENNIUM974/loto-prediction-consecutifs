// Variables globales
let allDraws = [];
let last50Draws = [];
let historicalGrids = [];
let consecutiveStats = {
    total: 0,
    withConsecutive: 0,
    patterns: {},
    zones: {}
};

// Fonction pour charger et analyser le fichier CSV
function loadCSVFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier CSV');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        parseCSVData(csvData);
    };
    reader.readAsText(file);
}

// Fonction pour parser les données CSV
function parseCSVData(csvData) {
    const lines = csvData.trim().split('\n');
    allDraws = [];
    historicalGrids = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const parts = line.split(',');
            if (parts.length >= 7) {
                const date = parts[0];
                const numbers = parts.slice(1, 6).map(n => parseInt(n)).sort((a, b) => a - b);
                const chance = parseInt(parts[6]);
                
                allDraws.push({
                    date: date,
                    numbers: numbers,
                    chance: chance
                });
                
                historicalGrids.push(numbers.join(','));
            }
        }
    }
    
    last50Draws = allDraws.slice(-50);
    analyzeConsecutivePatterns();
    updateUI();
}
// Fonction pour analyser les patterns consécutifs
function analyzeConsecutivePatterns() {
    consecutiveStats = {
        total: allDraws.length,
        withConsecutive: 0,
        patterns: {},
        zones: {}
    };
    
    allDraws.forEach(draw => {
        const hasConsecutive = checkConsecutiveInDraw(draw.numbers);
        if (hasConsecutive.found) {
            consecutiveStats.withConsecutive++;
            
            hasConsecutive.pairs.forEach(pair => {
                const pattern = `${pair[0]}-${pair[1]}`;
                consecutiveStats.patterns[pattern] = (consecutiveStats.patterns[pattern] || 0) + 1;
                
                const zone = Math.floor(pair[0] / 10);
                consecutiveStats.zones[zone] = (consecutiveStats.zones[zone] || 0) + 1;
            });
        }
    });
}

// Fonction pour vérifier les consécutifs dans un tirage
function checkConsecutiveInDraw(numbers) {
    const pairs = [];
    
    for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i + 1] - numbers[i] === 1) {
            pairs.push([numbers[i], numbers[i + 1]]);
        }
    }
    
    return {
        found: pairs.length > 0,
        pairs: pairs,
        count: pairs.length
    };
}

// Fonction pour mettre à jour l'interface
function updateUI() {
    document.getElementById('totalDraws').textContent = allDraws.length;
    document.getElementById('consecutiveCount').textContent = consecutiveStats.withConsecutive;
    document.getElementById('historicalGrids').textContent = historicalGrids.length;
    
    const percentage = ((consecutiveStats.withConsecutive / consecutiveStats.total) * 100).toFixed(1);
    document.getElementById('consecutivePercent').textContent = percentage + '%';
    
    displayConsecutiveAnalysis();
    
    document.getElementById('fileInfo').innerHTML = `
        <p>✅ Fichier chargé: ${allDraws.length} tirages analysés</p>
        <p>📊 ${consecutiveStats.withConsecutive} tirages avec consécutifs (${percentage}%)</p>
        <p>🎯 ${last50Draws.length} derniers tirages prêts pour prédiction</p>
    `;
}

// Fonction pour afficher l'analyse détaillée des consécutifs
function displayConsecutiveAnalysis() {
    const analysisDiv = document.getElementById('consecutiveAnalysis');
    
    const sortedPatterns = Object.entries(consecutiveStats.patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const percentage = ((consecutiveStats.withConsecutive / consecutiveStats.total) * 100).toFixed(1);
    
    analysisDiv.innerHTML = `
        <div>
            <h3>🎯 Statistiques Globales</h3>
            <p><strong>${consecutiveStats.withConsecutive}</strong> tirages sur <strong>${consecutiveStats.total}</strong> contiennent des consécutifs (<strong>${percentage}%</strong>)</p>
            
            <h3 style="margin-top: 20px;">🔥 Top 10 Paires Consécutives</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 10px;">
                ${sortedPatterns.map(([pattern, count]) => `
                    <div style="background: rgba(255,                    <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 5px; text-align: center;">
                        <strong>${pattern}</strong><br>
                        <small>${count} fois</small>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Fonction pour vérifier si une grille existe dans l'historique
function isGridInHistory(numbers) {
    const gridString = numbers.sort((a, b) => a - b).join(',');
    return historicalGrids.includes(gridString);
}

// Fonction pour calculer les scores des numéros (50 derniers tirages)
function calculateNumberScores() {
    const scores = {};
    
    for (let i = 1; i <= 49; i++) {
        scores[i] = 0;
    }
    
    last50Draws.forEach((draw, index) => {
        const weight = (index + 1) / last50Draws.length;
        
        draw.numbers.forEach(num => {
            scores[num] += weight;
        });
    });
    
    return scores;
}
// Fonction principale pour générer 7 grilles uniques
function generatePredictions() {
    if (last50Draws.length === 0) {
        alert('Veuillez d\'abord charger un fichier CSV');
        return;
    }
    
    const grids = [];
    let attempts = 0;
    const maxAttempts = 10000;
    
    while (grids.length < 7 && attempts < maxAttempts) {
        const grid = generateSmartGrid();
        
        if (!isGridInHistory(grid)) {
            const gridString = grid.sort((a, b) => a - b).join(',');
            const isDuplicate = grids.some(g => g.join(',') === gridString);
            
            if (!isDuplicate) {
                grids.push([...grid]);
            }
        }
        attempts++;
    }
    
    if (grids.length < 7) {
        alert(`Attention: seulement ${grids.length} grilles uniques générées`);
    }
    
    displayResults(grids, 'Prédictions Standard');
}

// Fonction pour générer des grilles avec focus sur les consécutifs
function generateConsecutiveGrids() {
    if (last50Draws.length === 0) {
        alert('Veuillez d\'abord charger un fichier CSV');
        return;
    }
    
    const grids = [];
    let attempts = 0;
    const maxAttempts = 10000;
    
    while (grids.length < 7 && attempts < maxAttempts) {
        const grid = generateConsecutiveSmartGrid();
        
        if (!isGridInHistory(grid)) {
            const gridString = grid.sort((a, b) => a - b).join(',');
            const isDuplicate = grids.some(g => g.join(',') === gridString);
            
            if (!isDuplicate) {
                grids.push([...grid]);
            }
        }
        attempts++;
    }
    
    displayResults(grids, 'Prédictions Mode Consécutifs');
}

// Fonction pour générer une grille intelligente standard
function generateSmartGrid() {
    const scores = calculateNumberScores();
    const numbers = [];
    
    const sortedNumbers = Object.entries(scores)
        .map(([num, score]) => ({num: parseInt(num), score}))
        .sort((a, b) => b.score - a.score);
    
    const topNumbers = sortedNumbers.slice(0, 15);
    const midNumbers = sortedNumbers.slice(15, 35);
    const lowNumbers = sortedNumbers.slice(35);
    
    numbers.push(...getRandomFromArray(topNumbers, 2).map(n => n.num));
    numbers.push(...getRandomFromArray(midNumbers, 2).map(n => n.num));
    numbers.push(...getRandomFromArray(lowNumbers, 1).map(n => n.num));
    
    return numbers.sort((a, b) => a - b);
}

// Fonction pour générer une grille avec focus sur les consécutifs
function generateConsecutiveSmartGrid() {
    const scores = calculateNumberScores();
    const numbers = [];
    
    const consecutivePair = selectBestConsecutivePair(scores);
    numbers.push(...consecutivePair);
    
    const remaining = [];
    for (let i = 1; i <= 49; i++) {
        if (!numbers.includes(i)) {
            remaining.push({num: i, score: scores[i]});
        }
    }
    
    remaining.sort((a, b) => b.score - a.score);
    
    const selected = [];
    selected.push(remaining[0].num);
    selected.push(remaining[Math.floor(Math    selected.push(remaining[Math.floor(Math.random() * 5) + 1].num);
    selected.push(remaining[Math.floor(Math.random() * 10) + 10].num);
    
    numbers.push(...selected);
    
    return numbers.sort((a, b) => a - b);
}

// Fonction pour sélectionner la meilleure paire consécutive
function selectBestConsecutivePair(scores) {
    const pairs = [];
    
    for (let i = 1; i <= 48; i++) {
        const pairScore = scores[i] + scores[i + 1];
        const pattern = `${i}-${i + 1}`;
        const historyBonus = consecutiveStats.patterns[pattern] || 0;
        
        pairs.push({
            numbers: [i, i + 1],
            score: pairScore + (historyBonus * 0.1)
        });
    }
    
    pairs.sort((a, b) => b.score - a.score);
    const topPairs = pairs.slice(0, 10);
    const selectedPair = topPairs[Math.floor(Math.random() * topPairs.length)];
    
    return selectedPair.numbers;
}

// Fonction utilitaire pour sélectionner des éléments aléatoires
function getRandomFromArray(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}
// Fonction pour afficher les résultats
function displayResults(grids, title) {
    const resultsSection = document.getElementById('resultsSection');
    const gridResults = document.getElementById('gridResults');
    
    let html = `<h3 style="color: #fff; margin-bottom: 20px;">${title}</h3>`;
    html += '<div class="grid-container">';
    
    grids.forEach((grid, index) => {
        const consecutiveInfo = checkConsecutiveInDraw(grid);
        const hasConsecutive = consecutiveInfo.found;
        
        html += `
            <div class="grid-item">
                <h4 style="color: #fff;">Grille ${index + 1} ${hasConsecutive ? '🔥' : ''}</h4>
                <div class="grid-numbers">
                    ${grid.map(num => {
                        const isInConsecutive = hasConsecutive && consecutiveInfo.pairs.some(pair => pair.includes(num));
                        const cssClass = isInConsecutive ? 'number consecutive-highlight' : 'number';
                        return `<span class="${cssClass}">${num}</span>`;
                    }).join('')}
                </div>
                ${hasConsecutive ? `<p style="color: #4caf50; margin-top: 10px;">✅ Contient ${consecutiveInfo.pairs.length} paire(s) consécutive(s)</p>` : '<p style="color: #ffa726; margin-top: 10px;">⚠️ Pas de consécutifs</p>'}
            </div>
        `;
    });
    
    html += '</div>';
    
    const consecutiveGrids = grids.filter(grid => checkConsecutiveInDraw(grid).found).length;
    html += `
        <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-top: 20px;">
            <h4 style="color: #fff;">📊 Statistiques des grilles générées:</h4>
            <p style="color: #fff;">• ${consecutiveGrids} grilles sur ${grids.length} contiennent des consécutifs (${((consecutiveGrids/grids.length)*100).toFixed(1)}%)</p>
            <p style="color: #fff;">• Toutes les grilles sont uniques et inédites depuis 1976</p>
            <p style="color: #fff;">• Prédictions basées sur les ${last50Draws.length} derniers tirages</p>
        </div>
    `;
    
    gridResults.innerHTML = html;
    resultsSection.style.display = 'block';
}
