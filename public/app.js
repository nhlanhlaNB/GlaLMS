// public/app.js (Shared JavaScript)
const firebaseConfig = {
    // Replace with your Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '/index.html');
});

function checkUserRole(uid, expectedRole) {
    db.collection('users').doc(uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.role !== expectedRole) {
                alert('Access denied.');
                auth.signOut();
            } else if (expectedRole === 'student') {
                document.getElementById('welcomeMsg').textContent = `Welcome, ${data.name || 'Student'}`;
            }
        } else {
            alert('User not found.');
            auth.signOut();
        }
    }).catch(() => auth.signOut());
}

function loadStudentCourse(uid) {
    db.collection('users').doc(uid).get().then(doc => {
        const data = doc.data();
        if (data.approvedCourse) {
            document.getElementById('enrollmentSection').classList.add('hidden');
            document.getElementById('courseContent').classList.remove('hidden');
            document.getElementById('courseTitle').textContent = data.approvedCourse;
            const progress = data.progress || { videosDone: false, tutorialsDone: false };
            if (progress.videosDone) document.getElementById('tutorialsSection').classList.remove('hidden');
            if (progress.tutorialsDone) document.getElementById('testSection').classList.remove('hidden');
            document.getElementById('scoreDisplay').textContent = `Test Score: ${data.score || 'Not taken'}`;
        } else if (data.appliedCourse) {
            alert('Your application for ' + data.appliedCourse + ' is pending.');
        }
    });
}

function applyCourse(course) {
    const uid = auth.currentUser.uid;
    db.collection('users').doc(uid).update({ appliedCourse: course });
    alert('Applied for ' + course + '. Waiting for approval.');
}

function loadStudents() {
    db.collection('users').where('role', '==', 'student').get().then(snapshot => {
        const table = document.getElementById('studentsTable');
        table.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const row = `<tr>
                <td>${data.glaNumber}</td>
                <td>${data.name || 'N/A'}</td>
                <td>${data.appliedCourse || 'None'}</td>
                <td>
                    <select class="form-select" onchange="approveCourse('${doc.id}', this.value)">
                        <option value="">Select</option>
                        <option value="Coding with Python">Coding with Python</option>
                        <option value="Using AI to Code">Using AI to Code</option>
                    </select>
                </td>
                <td><button class="btn btn-danger" onclick="deleteStudent('${doc.id}')">Delete</button></td>
            </tr>`;
            table.innerHTML += row;
        });
    });
}

function approveCourse(uid, course) {
    db.collection('users').doc(uid).update({ approvedCourse: course, appliedCourse: null });
    loadStudents();
}

function deleteStudent(uid) {
    db.collection('users').doc(uid).delete();
    loadStudents();
}

// Global Auth Listener for Redirects
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const role = doc.data().role;
                if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
                    if (role === 'admin') window.location.href = '/admin-dashboard.html';
                    else if (role === 'student') window.location.href = '/student-dashboard.html';
                }
            }
        });
    } else if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = '/index.html';
    }
});