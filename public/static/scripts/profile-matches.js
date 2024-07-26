
let players = [];
let allPlayers = [];
let matches = [];
let allMatches = [];
let college = null;
let colleges = [];
let allColleges = [];
attrs = ['team_type', 't1_names', 't2_names', 't1score', 't2score']
titles = ['Type', 'Team', 'Opponent', 'Score', 'Opponent Score']; // 'Gender'
to_show = ['team_type', 't1_names', 't2_names', 't1score', 't2score'];
az = ['team_type', 't1_names', 't2_names'];
sorts = [1, 0, 0, 0, 0];
last_search = null;
sort_initialized = false;

let searchCollege = null;

let gender = 'Male';


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

    ps_w = [];
    ps_m = [];
    ps_f = [];

    for (p in ps) {
        if (ps[p].divison == null && ps[p].gender == null) {
            continue;
        }
        for (key in ps[p]) {
            if (ps[p][key] === null || ps[p][key] === '') {
                if (key === 'division') {
                    ps[p][key] = 3;
                } else {
                    ps[p][key] = 'N/A'
                }
            }
        }
        ps[p].overall = 0;
        let changed = 0
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
        if (ps[p].gender === 'Male') {
            ps_m.push(ps[p]);
        } else if (ps[p].gender == 'Female') {
            ps_w.push(ps[p]);
        } else {
            ps_f.push(ps[p]);
        }
    }

    ps_m = ps_m.sort((a, b) => b.overall - a.overall);
    ps_m.forEach((player, i) => {
        player.ranking = i+1;
    })

    ps_w = ps_w.sort((a, b) => b.overall - a.overall);
    ps_w.forEach((player, i) => {
        player.ranking = i+1;
    })

    let total_players = ps_w.length + ps_m.length + ps_f.length
    ps_f.forEach(player => {
        if (player.gender === 'Male') {
            player.ranking = ps_m.length+1;
        } else if (player.gender === 'Female') {
            player.ranking = ps_w.length+1;
        } else {
            player.ranking = total_players;
        }
    });

    ps_f = ps_f.concat(ps_m, ps_w).sort((a, b) => b.overall - a.overall);
    ps_f = ps_f.sort((a, b) => b.overall - a.overall);
    ps_f.forEach((player, i) => {
        player.overall_ranking = i+1;
        if (player.ranking === total_players) {
            player.ranking = player.overall_ranking;
        }
    })
    
    return ps_f;
}

function getPlayer(id) {
    if (players.length === 0) {
        return null;
    } else {
        for (i in players) {
            if (players[i].profile_id == id) {
                return players[i];
            }
        }
        return null;
    }
}

async function getColleges() {
    cs = {};
    for (i in allPlayers) {
        let overall = allPlayers[i].overall;
        let college = allPlayers[i].college;
        if (!(college in cs))
            cs[college] = {'eligible': 0, 'eligible_counter': 0, 'ineligible': 0, 'ineligible_counter': 0, 'players': 0};
        cs[college].players += 1;
        if (overall != -100) {
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
                    if (cols[c].ranking === null) {
                        cs_refined[c_r].ranking = 'Not Ranked';
                    }
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

async function getMatches() {
    let me = (await fetch('/me?more_matches=true').then(res => res.json()));
    let my_id = me.info.player.profile_id;
    me = me.info.past_matches;
    for (let i in me) {
        let t1 = [];
        let t2 = [];
        let t1_names = [];
        let t2_names = [];
        if (typeof(me[i].profile_ids_t1) == 'string')
            me[i].profile_ids_t1 = me[i].profile_ids_t1.split(',');
        if (typeof(me[i].profile_ids_t2) == 'string')
            me[i].profile_ids_t2 = me[i].profile_ids_t2.split(',');

        for (let id = 0; id < me[i].profile_ids_t1.length; id++) {
            t1.push(getPlayer(me[i].profile_ids_t1[id]));
            t1_names.push(t1[t1.length-1].first_name + ' ' + t1[t1.length-1].last_name)
        }
        for (let id = 0; id < me[i].profile_ids_t2.length; id++) {
            t2.push(getPlayer(me[i].profile_ids_t2[id]));
            t2_names.push(t2[t2.length-1].first_name + ' ' + t2[t2.length-1].last_name)
        }

        console.log(me[i])

        if (me[i].profile_ids_t1.includes(my_id.toString())) {
            me[i].t1 = t1;
            me[i].t2 = t2;
            me[i].t1_names = t1_names.join(' / ');
            me[i].t2_names = t2_names.join(' / ');
        } else {
            me[i].t1 = t2;
            me[i].t2 = t1;
            me[i].t1_names = t2_names.join(' / ');
            me[i].t2_names = t1_names.join(' / ');
            let t1score = me[i].t1score;
            me[i].t1score = me[i].t2score;
            me[i].t2score = t1score;
        }
    }
    return me;
}

async function sortPlayers(sortBy='first_name', order=1, setup_called=false) {
    document.querySelector('div.loading').classList.remove('hide');
    if (az.indexOf(sortBy) !== -1) {
        if (order == 1) {
            players.sort((a, b) => a[sortBy].localeCompare(b[sortBy]));
        } else {
            players.sort((a, b) => b[sortBy].localeCompare(a[sortBy]));
        }
    } else {
        if (order == 1) {
            players.sort((a, b) => a[(sortBy === 'ranking' ? 'overall_ranking' : sortBy)] - b[(sortBy === 'ranking' ? 'overall_ranking' : sortBy)]);
        } else {
            players.sort((a, b) => b[(sortBy === 'ranking' ? 'overall_ranking' : sortBy)] - a[(sortBy === 'ranking' ? 'overall_ranking' : sortBy)]);
        }
    }

    if (!setup_called)
        await setup(false);
    setTimeout(() => {
        document.querySelector('div.loading').classList.add('hide');
    }, 10)
}

function argMax(so) {
    if (so.length == 0)
        return null, null
    let ma = sorts[0];
    let maInd = 0;
    for(let i = 0; i < sorts.length; i++) {
        if (sorts[i] > ma) {
            ma = sorts[i];
            maInd = i;
        }
    }
    return [ma, maInd];
}

async function setup(startup=true, back=false) {
    let table = document.querySelector('table.player-table');
    if (startup) {
        if (back) {
            if (!to_show.includes('college'))
                to_show.push('college');

            new_to_show = [];

            for (a in attrs) {
                if (to_show.includes(attrs[a]) && !new_to_show.includes(attrs[a])) {
                    new_to_show.push(attrs[a]);
                }
            }

            to_show = new_to_show;
        }
        document.querySelector('h1.college').innerHTML = 'MATCHES';
        
        sorts = [1];
        for (let a = 1; a < to_show.length; a++) {
            sorts.push(0);
        }
        // if (last_search != null) {
        //     ;
        // }
        allPlayers = await getPlayers();
        players = [...allPlayers];
        allMatches = await getMatches();
        matches = [...allMatches];
        
        t = '<tr style="position: sticky; top: 0;">'
        for (key in to_show) {
            t += `<th>${titles[attrs.indexOf(to_show[key])]}</th>`;
        }

        await search(last_search);

        t += '</tr>';
        table.innerHTML = t;
        // Sort Headings
        let headings = table.querySelectorAll('th');
        for (let i = 0; i < headings.length; i++) {
            headings[i].addEventListener('click', event => {
                if (sorts[i] == 0) {
                    sorts[i] = 1;
                }
                if (az.indexOf(attrs[titles.indexOf(event.target.innerText)]) == -1 && attrs[titles.indexOf(event.target.innerText)] != 'ranking' && attrs[titles.indexOf(event.target.innerText)] != 'division') {
                    sorts[i] = 2;
                }
                // else if (sorts[i] == 1) {
                //     sorts[i] += 1;
                // } else {
                //     sorts[i] -= 1;
                // }
                for (s in sorts) {
                    if (s != i) {
                        sorts[s] = 0;
                    }
                }
                document.querySelector('select.sort').selectedIndex = i;  // to_show.indexOf(attrs[titles.indexOf(event.target.innerText)])
                sortPlayers(to_show[i], sorts[i])
            });
        }

        let select = document.querySelector('select.sort');
        select.innerHTML = '';
        for (a in to_show) {
            // Select
            let op = document.createElement('option');
            op.value = to_show[a] + ((az.indexOf(to_show[a]) == -1 && (to_show[a] != 'ranking' && to_show[a] != 'division')) ? '2' : '1');
            op.innerText = titles[attrs.indexOf(to_show[a])] + (az.indexOf(to_show[a]) == -1 ? ((to_show[a] == 'ranking' || to_show[a] == 'division') ? ' Low->High' : ' High->Low') : ' A->Z');
            select.appendChild(op);
        }
        
        // await sortBy(to_show)

        let additions = document.querySelector('.column-additions');
        additions.innerHTML = '';
        for (t in titles) {
            // Additions
            if (college != null && attrs[t] == 'college') {
                continue;
            }
            let div = document.createElement('div');
            div.classList.add('con');
            let button = document.createElement('button');
            button.addEventListener('click', event => {
                selectAddition(event);
            });
            let h2 = document.createElement('h2');

            if (to_show.includes(attrs[t])) {
                button.classList.add('selected');
            }

            h2.innerText = titles[t];
            div.appendChild(button);
            div.appendChild(h2);
            additions.appendChild(div);
        }
    }

    let playersE = table.querySelectorAll('tr');
    for (let i = 1; i < playersE.length; i++) {
        playersE[i].remove();
    }

    for (let i = 0; i < matches.length; i++) {
        let tr = document.createElement('tr');
        for (let a = 0; a < to_show.length; a++) {
            let td = document.createElement('td');
            td.innerHTML = matches[i][to_show[a]]
            // td.setAttribute('style', `background-color: rgb(0, 0, ${Math.min(1, players[i].singles_rating / 8) * 250})`);
            
            tr.appendChild(td);
        }
        tr.addEventListener('click', (event) => {
            showPlayer(event)
        })
        table.appendChild(tr);
    }

}

async function showPlayer(event) {
    let pp = document.querySelector('.player-profile');
    let trs = document.querySelectorAll('.player-table tr')
    trs.forEach((tr, i) => {
        if (tr == event.target.parentElement) {
            let top = document.querySelector('.player-container .top');
            top.innerHTML = '';
            let middle = document.querySelector('.player-container .middle');
            middle.innerHTML = '';
            let bottom = document.querySelector('.player-container .bottom');
            bottom.innerHTML = '';

            let player_name = document.createElement('h1');
            player_name.innerText = players[i-1].first_name + ' ' + players[i-1].last_name;
            top.appendChild(player_name);

            let player_college = document.createElement('h2');
            player_college.style.cursor = 'alias';
            player_college.style.textDecoration = 'underline';
            player_college.innerText = players[i-1].college.trimEnd();
            player_college.addEventListener('click', async(event) => {
                event.stopPropagation();
                window.open(`/players?college=${encodeURIComponent(players[i-1].college.trimEnd())}`);
            });
            top.appendChild(player_college);

            if (players[i-1].division < 3 || players[i-1].gender != 'N/A') {
                let player_classification = document.createElement('h2');
                if (players[i-1].division < 3) {
                    if (players[i-1].gender != 'N/A') {
                        player_classification.innerText = 'D' + players[i-1].division + ' ' + players[i-1].gender;
                    } else {
                        player_classification.innerText = 'D' + players[i-1].division;
                    }
                } else {
                    player_classification.innerText = players[i-1].gender;
                }
                
                top.appendChild(player_classification);
            }

            // Middle
            let player_ranking = document.createElement('h2');
            player_ranking.innerText = 'Gender Ranking: ' + players[i-1].ranking;
            middle.appendChild(player_ranking);
            
            if (players[i-1].singles_games_played > 0) {
                let player_singles_rating = document.createElement('h2');
                if (players[i-1].singles_games_played >= 5)
                    player_singles_rating.innerText = 'Singles: ' + players[i-1].singles_rating;
                else
                    player_singles_rating.innerText = 'Singles: (' + players[i-1].singles_rating + ')';
                middle.appendChild(player_singles_rating);
            }

            if (players[i-1].doubles_games_played > 0) {
                let player_doubles_rating = document.createElement('h2');
                if (players[i-1].doubles_games_played >= 5)
                    player_doubles_rating.innerText = 'Doubles: ' + players[i-1].doubles_rating;
                else
                    player_doubles_rating.innerText = 'Doubles: (' + players[i-1].doubles_rating + ')';
                middle.appendChild(player_doubles_rating);
            }

            if (players[i-1].mixed_doubles_games_played > 0) {
                let player_mixed_doubles_rating = document.createElement('h2');
                if (players[i-1].mixed_doubles_games_played >= 5)
                    player_mixed_doubles_rating.innerText = 'Mixed Doubles: ' + players[i-1].mixed_doubles_rating;
                else
                    player_mixed_doubles_rating.innerText = 'Mixed Doubles: (' + players[i-1].mixed_doubles_rating + ')';
                middle.appendChild(player_mixed_doubles_rating);
            }

            let player_wl = document.createElement('h2');
            player_wl.innerText = `W/L: ${players[i-1].wins == 0 ? 0 : (players[i-1].losses == 0 ? 100 : (players[i-1].wins/(players[i-1].wins + players[i-1].losses) * 100).toFixed(0))}% (${players[i-1].wins}/${players[i-1].losses})`;
            bottom.appendChild(player_wl);

            // pp.querySelector('h2.player-rank').innerText = 'Gender Rank: ' + players[i-1].ranking;
            // pp.querySelector('h2.player-overall').innerText = 'Rating: ' + (players[i-1].overall == -100 ? 'Ineligible' : (players[i-1].overall < 0 ? ((players[i-1].overall + 99).toFixed(2) + ' (Not fully eligible)') : players[i-1].overall.toFixed(2)));
            

            pp.classList.remove('hide');
            return;
        }
    })
}


async function search(search=null) {
    if (search == null)
        search = document.querySelector('.search-div input').value;
    document.querySelector('div.loading').classList.remove('hide');

    players = [];
    for (p in allPlayers) {
        for (key in allPlayers[p]) {
            if (college == null) {
                if (to_show.includes(key) && allPlayers[p][key].toString().toLowerCase().includes(search.toLowerCase())) {
                    players.push(allPlayers[p]);
                    break;
                }
            } else {
                if (allPlayers[p].college.trimEnd() == college.trimEnd() && to_show.includes(key) && allPlayers[p][key].toString().toLowerCase().includes(search.toLowerCase())) {
                    players.push(allPlayers[p]);
                    break;
                }
            }
        }
    }

    await sortPlayers(to_show[(argMax(sorts))[1]], sorts[(argMax(sorts))[1]]);
    last_search = search;

    let np = [];
    for (player in players) {
        if (gender === 'All' || players[player].gender === gender) {
            np.push(players[player]);
        }
    }

    players = np;
    delete np;

    await setup(false);
    setTimeout(() => {
        document.querySelector('div.loading').classList.add('hide');
    })
}

async function selectAddition(event) {
    let add = !event.target.classList.contains('selected');
    if (add) {
        event.target.classList.add('selected');
        to_show.push(attrs[titles.indexOf(event.target.parentElement.querySelector('h2').innerText)]);
    } else {
        event.target.classList.remove('selected');
        let ind = to_show.indexOf(attrs[titles.indexOf(event.target.parentElement.querySelector('h2').innerText)]);
        if (ind !== -1) {
            to_show.splice(ind, 1);
        }
    }

    new_to_show = [];

    for (a in attrs) {
        if (to_show.includes(attrs[a]) && !new_to_show.includes(attrs[a])) {
            new_to_show.push(attrs[a]);
        }
    }

    to_show = new_to_show;

    setup(true);
}

setup();

document.querySelector('select.sort').addEventListener('change', event => {
    sortPlayers(sortBy=event.target.value.substring(0, event.target.value.length-1), parseInt(event.target.value.charAt(event.target.value.length-1)));
})

document.querySelector('.search-div input').addEventListener('keydown', event => {
    if (event.key == 'Enter') {
        search();
    }
})