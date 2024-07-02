let players = [];

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

async function setup() {
    players = await getPlayers();
    let pE = document.querySelectorAll('ul.player-options');

    for (let q = 0; q < pE.length; q++) {
        pE[q].innerHTML = '';

        for (let i = 0; i < players.length; i++) {
            let li = document.createElement('li');
            li.innerText = players[i].first_name + ' ' + players[i].last_name;
            li.classList.add('show');
            li.addEventListener('mousedown', async (event) => {
                event.target.parentElement.parentElement.querySelector('input').value = event.target.innerText;
                let player = await getPlayer(event.target.innerText);
                if (player) {
                    let e = document.querySelector('h3.rating-start.' + (event.target.parentElement.classList.contains('one') ? 'one' : 'two'));
                    e.innerHTML = player.singles_rating;
                    e.classList.add('done');
                }
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
        let score1 = parseInt(document.querySelector('.score1-input').value);
        let score2 = parseInt(document.querySelector('.score2-input').value);

        if (player1 == null || player2 == null) {
            alert('Please provide 2 valid players');
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
                        't1_ids': [player1.player_id],
                        't2_ids': [player2.player_id]
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
                    e.innerHTML = res.new_ratings[1][0].toFixed(2);
                }
            }
        }
    } catch (error) {
        console.log(error);
        return;
    }
}

document.querySelector('input.player1-input').addEventListener('input', event => {
    // Start Rating
    let e = document.querySelector('.rating-start.one');
    e.classList.remove('done');
    e.innerHTML = '0.00';

    // New Rating
    e = document.querySelector('.rating-new.one');
    e.classList.remove('done');
    e.innerHTML = '0.00';

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
    // Start Rating
    let e = document.querySelector('.rating-start.two');
    e.classList.remove('done');
    e.innerHTML = '0.00'

    // New Rating
    e = document.querySelector('.rating-new.one');
    e.classList.remove('done');
    e.innerHTML = '0.00';

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
        event.target.parentElement.querySelector('ul.player-options').classList.add('show');
    })

    player_divsE[i].addEventListener('focusout', event => {
        event.target.parentElement.querySelector('ul.player-options').classList.remove('show');
    })
}


