colleges = [
    'Texas Tech University',
    'Texas A&M University',
    'University of Texas (Austin)'
]


function setupColleges() {
    let options = document.querySelector('.college-options');
    for (let i = 0; i < colleges.length; i++) {
        let c = document.createElement('li');
        c.innerText = colleges[i];
        c.addEventListener('mousedown', event => {
            console.log(event.target.innerText);
            document.querySelector('.college-input').value = event.target.innerText;
        })
        options.appendChild(c);
    }
}
setupColleges();


function createProfile() {
    let first_name = document.querySelector('#first-name').value;
    let last_name = document.querySelector('#last-name').value;
    let college = document.querySelector('#college').value;
    let email = document.querySelector('#email').value;
    let phone_number = document.querySelector('#phone-number').value;

    if (first_name.length == 0) {
        alert('Please enter a valid first name');
        return;
    } else if (last_name.length == 0) {
        alert('Please enter a valid last name');
        return;
    } else if (college.length == 0) {
        alert('Please enter a valid college');
        return;
    } else if (email.length == 0) {
        alert('Please enter a valid email');
        return;
    } else if (phone_number.length == 0) {
        alert('Please enter a valid phone number');
        return;
    }

    if (first_name.length > 20) {
        alert('First name can not be over 20 characters');
        return;
    } else if (last_name.length > 30) {
        alert('Last name can not be over 30 characters');
        return;
    } else if (college.length > 100) {
        alert('College name can not be over 100 characters');
        return;
    } else if (email.length > 50) {
        alert('Email can not be over 50 characters');
        return;
    } else if (phone_number.length > 20 || isNaN(phone_number)) {
        alert('Please enter a valid phone number');
        return;
    }


    const body = {
        first_name, last_name, college, email, phone_number
    }

    fetch('/create-profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    }).then(res => res.json())
    .then(res => {
        if ('success' in res) {
            if (res.success) {
                alert('Profile Created!');
            } else {
                alert(res.error);
            }
        } else {
            alert("Something went wrong");
        }
        return;
    }).catch(err => {
        alert('Something went wrong');
    })


}


function setCollegeSelect(search = '') {
    let options = document.querySelector('.college-options').querySelectorAll('li');
    options.forEach(option => {
        if (option.innerText.toLowerCase().indexOf(search.toLowerCase()) != -1) {
            option.classList.add('show');
        } else {
            option.classList.remove('show');
        }
    })
    // for (let i = 0; i < colleges.length; i++) {

    //     if (colleges[i].toLowerCase().indexOf(search.toLowerCase()) != -1) {
    //         console.log(colleges[i]);
    //     }
    // }
}

setCollegeSelect();


document.querySelector('.form input.college-input').addEventListener('input', event => {
    setCollegeSelect(event.target.value);
})

document.querySelector('.form .college-div').addEventListener('focusin', event => {
    document.querySelector('.form .college-options').classList.add('show');
})

document.querySelector('.form .college-div').addEventListener('focusout', event => {
    document.querySelector('.form .college-options').classList.remove('show');
})













function collegeDropDown() {
    let e = document.querySelector('.college-div .college-options');
    if (e != null) {
        if (e.classList.contains('show')) {
            e.classList.remove('show');
        } else {
            e.classList.add('show');
        }
    }
}




