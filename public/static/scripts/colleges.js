
let players = [];
let allPlayers = [];
let allColleges = [];
let colleges = [];
attrs = ['ranking', 'college'];  // overall, players
titles = ['Ranking', 'College'];  // Overall, Players
last_search = null;


// Set Page Height

async function setPageHeight() {
    document.querySelector('div.main').style.minHeight = window.innerHeight - 100 + 'px';
}

setPageHeight();

async function getPlayers() {
    ps = [];
    ps = await fetch('/api/get-players', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(res => res.json()).catch(err => {console.log('Error grabbing player')});

    for (p in ps) {
        for (key in ps[p]) {
            if (ps[p][key] == null) {
                ps[p][key] = 'N/A'
            }
        }
        ps[p].overall = 0;
        let changed = 0;
        if (ps[p].singles_games_played >= 5) {
            ps[p].overall += ps[p].singles_rating;
            changed += 1;
        }
        if (ps[p].doubles_games_played >= 5) {
            ps[p].overall += ps[p].doubles_rating;
            changed += 1;
        }
        if (ps[p].mixed_doubles_games_played >= 5) {
            ps[p].overall += ps[p].mixed_doubles_rating;
            changed += 1;
        }
        if (changed === 3) {
            ps[p].overall /= changed;
        } else if (changed === 0) {
            ps[p].overall = -100;
            continue;
        } else {
            ps[p].overall = -99 + ps[p].overall/changed;
        }
    }

    ps = ps.sort((a, b) => b.overall - a.overall);
    ps.forEach((player, i) => {
        player.ranking = i+1;
    })
    
    return ps;
}

async function getColleges() {
    cs = {};
    for (i in allPlayers) {
        let overall = allPlayers[i].overall;
        let college = allPlayers[i].college;
        if (!(college in cs))
            cs[college] = {'eligible': 0, 'eligible_counter': 0, 'ineligible': 0, 'ineligible_counter': 0, 'players': 0};
        cs[college].players += 1;
        if (allPlayers[i].division == 1 && overall != -100) {
            if (overall < 0) {  // Not eligible
                cs[college].ineligible += overall+99;
                cs[college].ineligible_counter += 1;
            } else {  // Eligible
                cs[college].eligible += overall;
                cs[college].eligible_counter += 1;
            }
        }
    }
    cs_refined = []
    for (c in cs) {
        overall = -100;
        if (cs[c].eligible_counter > 0) {
            overall = (cs[c].eligible / cs[c].eligible_counter);
        } else if (cs[c].ineligible_counter > 0) {
            overall = (cs[c].ineligible / cs[c].ineligible_counter) - 99;
        }
        if (c === 'N/A') {
            continue;
        }
        cs_refined.push({
            'college': c,
            'overall': overall,
            'players': cs[c].players
        })
    }
    delete cs;

    // cs_refined = cs_refined.sort((a, b) => b.overall - a.overall);
    // cs_refined.forEach((c, i) => {
    //     c.ranking = i+1;
    // })

    r = await fetch('/api/colleges', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(res => res.json());

    if (r['success'] === false) {
        alert('Something went wrong when grabbing colleges');
        return [];
    } else {
        cols = r.colleges;
        for (c in cols) {
            let found = false;
            for (c_r in cs_refined) {
                if (cs_refined[c_r].college.trimEnd() === cols[c].name.trimEnd()) {
                    cs_refined[c_r].ranking = cols[c].ranking;
                    break;
                }
            }
        }
    }

    cs_refined = cs_refined.sort((a, b) => {
        if (a.ranking === null) {
            if (b.ranking === null) {
                return b.overall - a.overall;
            }
            return 1;
        } else if (b.ranking === null) {
            return -1;
        } else {
            if (a.ranking === b.ranking) {
                return b.overall - a.overall;
            }
            return a.ranking - b.ranking
        }
    });

    return cs_refined;

}

async function setup(startup=true) {
    let table = document.querySelector('table.college-table');
    if (startup) {
        allPlayers = await getPlayers();
        players = [...allPlayers];
        await search(last_search);
        t = '<tr style="position: sticky; top: 0;">'
        for (a in attrs) {
            t += `<th>${titles[a]}</th>`;
        }
        t += '</tr>';
        table.innerHTML = t;
        allColleges = await getColleges();
        colleges = [...allColleges];
    }

    let collegesE = table.querySelectorAll('tr');
    for (let i = 1; i < collegesE.length; i++) {
        collegesE[i].remove();
    }

    for (let i = 0; i < colleges.length; i++) {
        let tr = document.createElement('tr');
        for (let a = 0; a < attrs.length; a++) {
            let td = document.createElement('td');
            if (attrs[a] == 'overall') {
                if (colleges[i][attrs[a]] === -100) {
                    td.innerHTML = 'Ineligible';
                } else if (colleges[i][attrs[a]] < 0) {
                    td.innerHTML = `(${(colleges[i][attrs[a]] + 99).toFixed(2)})`;
                } else {
                    td.innerHTML = colleges[i][attrs[a]].toFixed(2);
                }
            } else {
                td.innerHTML = colleges[i][attrs[a]]
            }
            if (attrs[a] == 'college') {
                td.style.cursor = 'alias';
                td.style.textDecoration = 'underline';
                td.style.fontWeight = '800';
                td.classList.add('college-name');
                td.addEventListener('click', (event) => {
                    event.stopPropagation();
                    window.open(`/players?college=${encodeURIComponent(colleges[i][attrs[a]])}`);
                });
            }
            tr.appendChild(td);
        }
        table.appendChild(tr);
    }

}

async function search(search=null) {
    if (search == null)
        search = document.querySelector('.search-div input').value;
    document.querySelector('div.loading').classList.remove('hide');

    colleges = [];
    for (p in allColleges) {
        for (key in allColleges[p]) {
            if (allColleges[p][key] != null && allColleges[p][key].toString().includes(search)) {
                colleges.push(allColleges[p]);
                break;
            }
        }
    }

    last_search = search;

    await setup(false);
    setTimeout(() => {
        document.querySelector('div.loading').classList.add('hide');
    })
}

setup();

document.querySelector('.search-div input').addEventListener('keydown', event => {
    if (event.key == 'Enter') {
        search();
    }
})