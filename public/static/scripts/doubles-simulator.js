let players = [];
let team1_input = 0;
let team2_input = 0;

async function getPlayers() {
    ps = [];
    ps = await fetch('/api/get-players', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(res => res.json()).catch(err => {console.log('Error grabbing player')});
    
    return ps;
}

async function getPlayer(first_name, last_name=null) {
    try {
        if (last_name == null) {
            last_name = first_name.substring(first_name.indexOf(' ')+1, first_name.length);
            first_name = first_name.substring(0, first_name.indexOf(" "));
        }
        for (let i = 0; i < players.length; i++) {
            if (players[i].first_name == first_name && players[i].last_name == last_name) {
                return players[i];
            }
        }
        return null;  // Doesn't exist
    } catch (error) {
        return null;
    }
}

async function updateRatingsHelper(input_query, rating_query) {
    try {
        let pE = document.querySelector(input_query).value;
        let fn = pE.substring(0, pE.indexOf(' '));
        let ln = pE.substring(fn.length+1, pE.length);
        
        for (let p = 0; p < players.length; p++) {
            if (fn == players[p].first_name && ln == players[p].last_name) { // Player valid
                let e = document.querySelector(rating_query);
                e.innerHTML = players[p].doubles_rating.toFixed(2);
                e.classList.add('done');
                return;
            }
        }

        let e = document.querySelector(rating_query);
        e.innerHTML = '0.00'
        e.classList.remove('done');
    } catch (error) {
        console.log(error);
        return;
    }
}

async function updateRatings() {
    await updateRatingsHelper('input#player1', 'h3.rating-start.one');
    await updateRatingsHelper('input#player2', 'h3.rating-start.two');
    await updateRatingsHelper('input#player3', 'h3.rating-start.three');
    await updateRatingsHelper('input#player4', 'h3.rating-start.four');
}

async function setup(startup=true) {
    if (startup)
        players = await getPlayers();
    let pE = document.querySelectorAll('ul.player-options');

    for (let q = 0; q < pE.length; q++) {
        pE[q].innerHTML = '';

        for (let i = 0; i < players.length; i++) {
            let li = document.createElement('li');
            li.innerText = players[i].first_name + ' ' + players[i].last_name;
            li.classList.add('show');
            li.addEventListener('mousedown', async (event) => {
                let team1 = !event.target.parentElement.parentElement.querySelector('input').getAttribute('class').includes('3');
                if (!team1) {
                    event.target.parentElement.parentElement.querySelectorAll('input')[team2_input].value = event.target.innerText;
                } else {
                    event.target.parentElement.parentElement.querySelectorAll('input')[team1_input].value = event.target.innerText;
                }
                // let player = await getPlayer(event.target.innerText);
                // if (player) {
                //     let e = document.querySelector('h3.rating-start' + (event.target.parentElement.classList.contains('one') ? 'one' : 'two'));
                //     e.innerHTML = player.singles_rating;
                //     e.classList.add('done');
                // }
                updateRatings();
            })
            pE[q].append(li);
        }
    }
}

setup();

async function simulate() {
    try {
        let player1 = await getPlayer(document.querySelector('.player1-input').value);
        let player2 = await getPlayer(document.querySelector('.player2-input').value);
        let player3 = await getPlayer(document.querySelector('.player3-input').value);
        let player4 = await getPlayer(document.querySelector('.player4-input').value);
        let score1 = parseInt(document.querySelector('.score1-input').value);
        let score2 = parseInt(document.querySelector('.score2-input').value);

        if (player1 == null || player2 == null || player3 == null || player4 == null) {
            alert('Please provide 4 valid players');
            return;
        } else if (score1 == NaN || score2 == NaN) {
            alert('Please provide 2 valid scores');
            return;
        } else {
            let res = await fetch('/api/simulator', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        't1score': score1,
                        't2score': score2,
                        't1_ids': [player1.player_id, player2.player_id],
                        't2_ids': [player3.player_id, player4.player_id]
                    })      
                }).then(res => res.json()).catch(error => {
                    console.log(error);
                    return;
                });
            if ('success' in res) {
                if (res.success) {
                    console.log(res.new_ratings)
                    // New Rating
                    e = document.querySelector('.rating-new.one');
                    e.classList.add('done');
                    e.innerHTML = res.new_ratings[0][0].toFixed(2);
                    e = document.querySelector('.rating-new.two');
                    e.classList.add('done');
                    e.innerHTML = res.new_ratings[0][1].toFixed(2);

                    e = document.querySelector('.rating-new.three');
                    e.classList.add('done');
                    e.innerHTML = res.new_ratings[1][0].toFixed(2);
                    e = document.querySelector('.rating-new.four');
                    e.classList.add('done');
                    e.innerHTML = res.new_ratings[1][1].toFixed(2);
                }
            }
        }
    } catch (error) {
        console.log(error);
        return;
    }
}

document.querySelector('input.player1-input').addEventListener('input', event => {
    team1_input = 0;

    if ('data' in event) {
        // Start Rating
        let e = document.querySelector('.rating-start.one');
        e.classList.remove('done');
        e.innerHTML = '0.00';

        // New Rating
        e = document.querySelector('.rating-new.one');
        e.classList.remove('done');
        e.innerHTML = '0.00';
    }

    let search = event.target.value;
    let options = event.target.parentElement.querySelector('.player-options').querySelectorAll('li');
    options.forEach(option => {
        if (option.innerText.toLowerCase().includes(search.toLowerCase())) {
            option.classList.add('show');
        } else {
            option.classList.remove('show');
        }
    })
});

document.querySelector('input.player2-input').addEventListener('input', event => {
    team1_input = 1;

    if ('data' in event) {
        // Start Rating
        let e = document.querySelector('.rating-start.two');
        e.classList.remove('done');
        e.innerHTML = '0.00'

        // New Rating
        e = document.querySelector('.rating-new.two');
        e.classList.remove('done');
        e.innerHTML = '0.00';
    }

    let search = event.target.value;
    let options = event.target.parentElement.querySelector('.player-options').querySelectorAll('li');
    options.forEach(option => {
        if (option.innerText.toLowerCase().includes(search.toLowerCase())) {
            option.classList.add('show');
        } else {
            option.classList.remove('show');
        }
    })
});

document.querySelector('input.player3-input').addEventListener('input', event => {
    team2_input = 0;

    if ('data' in event) {
        // Start Rating
        let e = document.querySelector('.rating-start.three');
        e.classList.remove('done');
        e.innerHTML = '0.00';

        // New Rating
        e = document.querySelector('.rating-new.three');
        e.classList.remove('done');
        e.innerHTML = '0.00';
    }

    let search = event.target.value;
    let options = event.target.parentElement.querySelector('.player-options').querySelectorAll('li');
    options.forEach(option => {
        if (option.innerText.toLowerCase().includes(search.toLowerCase())) {
            option.classList.add('show');
        } else {
            option.classList.remove('show');
        }
    })
});

document.querySelector('input.player4-input').addEventListener('input', event => {
    team2_input = 1;

    if ('data' in event) {
        // Start Rating
        let e = document.querySelector('.rating-start.four');
        e.classList.remove('done');
        e.innerHTML = '0.00'

        // New Rating
        e = document.querySelector('.rating-new.four');
        e.classList.remove('done');
        e.innerHTML = '0.00';
    }

    let search = event.target.value;
    let options = event.target.parentElement.querySelector('.player-options').querySelectorAll('li');
    options.forEach(option => {
        if (option.innerText.toLowerCase().includes(search.toLowerCase())) {
            option.classList.add('show');
        } else {
            option.classList.remove('show');
        }
    })
});

let player_divsE = document.querySelectorAll('div.players-div');
for (let i = 0; i < player_divsE.length; i++) {
    player_divsE[i].addEventListener('focusin', event => {
        switch (event.target.getAttribute('class')) {
            case 'player1-input':
                team1_input = 0;
                document.querySelector('input.player1-input').dispatchEvent(new Event('input'));
                break;
            case 'player2-input':
                team1_input = 1;
                document.querySelector('input.player2-input').dispatchEvent(new Event('input'));
                break;
            case 'player3-input':
                team2_input = 0;
                document.querySelector('input.player3-input').dispatchEvent(new Event('input'));
                break;
            case 'player4-input':
                team2_input = 1;
                document.querySelector('input.player4-input').dispatchEvent(new Event('input'));
                break;
        }
        event.target.parentElement.querySelector('ul.player-options').classList.add('show');
    })

    player_divsE[i].addEventListener('focusout', event => {
        event.target.parentElement.querySelector('ul.player-options').classList.remove('show');
    })
}


