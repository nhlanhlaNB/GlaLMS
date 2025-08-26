// Enhanced app.js (Shared JavaScript)
const firebaseConfig = {
    // Replace with your actual Firebase config
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings for better performance
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
firebase.firestore().enablePersistence({
    synchronizeTabs: true
}).catch((err) => {
    console.log("Persistence failed:", err);
});

// Global variables
let currentUserData = null;
let networkStatus = navigator.onLine;

// Network status monitoring
window.addEventListener('online', () => {
    networkStatus = true;
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    networkStatus = false;
    showNotification('Working offline', 'warning');
});

// Enhanced logout functionality
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await auth.signOut();
                    showNotification('Logged out successfully', 'success');
                    setTimeout(() => {
                        window.location.href = '/index.html';
                    }, 1000);
                } catch (error) {
                    console.error('Logout error:', error);
                    showNotification('Error logging out', 'error');
                }
            }
        });
    }
});

// Enhanced role checking with better error handling
async function checkUserRole(uid, expectedRole) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        
        if (!doc.exists) {
            throw new Error('User profile not found');
        }
        
        const userData = doc.data();
        currentUserData = userData;
        
        if (userData.role !== expectedRole) {
            showNotification('Access denied - insufficient permissions', 'error');
            await auth.signOut();
            window.location.href = '/index.html';
            return false;
        }
        
        // Update UI based on role and user data
        updateUIForUser(userData, expectedRole);
        
        return true;
        
    } catch (error) {
        console.error('Role check error:', error);
        showNotification('Error verifying permissions', 'error');
        await auth.signOut();
        window.location.href = '/index.html';
        return false;
    }
}

// Update UI elements based on user data
function updateUIForUser(userData, role) {
    // Update welcome messages
    const welcomeElements = document.querySelectorAll('[id*="welcome"], [id*="Welcome"]');
    welcomeElements.forEach(el => {
        if (el.textContent.includes('Welcome')) {
            el.textContent = `Welcome, ${userData.name || userData.glaNumber || 'User'}!`;
        }
    });
    
    // Update navigation user info
    const userInfoElements = document.querySelectorAll('.user-info, #userName, #studentName');
    userInfoElements.forEach(el => {
        el.textContent = userData.name || userData.glaNumber || 'User';
    });
    
    // Add role-specific styling or functionality
    document.body.classList.add(`role-${role}`);
    
    // Store user data globally for other functions
    window.currentUser = userData;
}

// Enhanced student course loading
async function loadStudentCourse(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        
        if (!doc.exists) {
            throw new Error('User not found');
        }
        
        const data = doc.data();
        
        // Hide enrollment section and show course content
        const enrollmentSection = document.getElementById('enrollmentSection');
        const courseContent = document.getElementById('courseContent');
        
        if (enrollmentSection) enrollmentSection.classList.add('hidden');
        
        if (data.approvedCourse) {
            if (courseContent) {
                courseContent.classList.remove('hidden');
                courseContent.style.display = 'block';
            }
            
            // Update course title
            const courseTitleEl = document.getElementById('courseTitle');
            if (courseTitleEl) {
                courseTitleEl.textContent = data.approvedCourse;
            }
            
            // Load and display progress
            const progress = data.progress || { 
                videosDone: false, 
                tutorialsDone: false, 
                testDone: false 
            };
            
            updateProgressDisplay(progress);
            
            // Update score display
            const scoreDisplay = document.getElementById('scoreDisplay');
            if (scoreDisplay) {
                const scoreText = data.score ? `Test Score: ${data.score}%` : 'Test Score: Not taken';
                scoreDisplay.textContent = scoreText;
                
                // Add score styling
                if (data.score) {
                    scoreDisplay.className = `alert ${getScoreClass(data.score)}`;
                }
            }
            
        } else if (data.appliedCourse) {
            showNotification(`Your application for ${data.appliedCourse} is pending approval`, 'info');
        } else {
            showNotification('No course assigned. Please contact your administrator.', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading student course:', error);
        showNotification('Error loading course information', 'error');
    }
}

// Get appropriate CSS class based on score
function getScoreClass(score) {
    if (score >= 80) return 'alert-success';
    if (score >= 60) return 'alert-warning';
    return 'alert-danger';
}

// Update progress display elements
function updateProgressDisplay(progress) {
    // Update section visibility based on progress
    const sections = [
        { id: 'tutorialsSection', condition: progress.videosDone },
        { id: 'testSection', condition: progress.tutorialsDone }
    ];
    
    sections.forEach(({ id, condition }) => {
        const element = document.getElementById(id);
        if (element) {
            if (condition) {
                element.classList.remove('hidden');
                element.style.display = 'block';
            } else {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        }
    });
    
    // Update progress indicators
    updateProgressIndicators(progress);
}

// Update visual progress indicators
function updateProgressIndicators(progress) {
    const indicators = [
        { id: 'videoProgress', completed: progress.videosDone, label: 'Videos' },
        { id: 'tutorialProgress', completed: progress.tutorialsDone, label: 'Tutorials' },
        { id: 'testProgress', completed: progress.testDone, label: 'Assessment' }
    ];
    
    indicators.forEach(({ id, completed, label }) => {
        const element = document.getElementById(id);
        if (element) {
            element.className = `badge ${completed ? 'bg-success' : 'bg-secondary'}`;
            element.textContent = completed ? `${label} ✓` : label;
        }
    });
}

// Course application functionality (for systems that still need it)
async function applyCourse(course) {
    if (!auth.currentUser) {
        showNotification('Please log in first', 'error');
        return;
    }
    
    try {
        await db.collection('users').doc(auth.currentUser.uid).update({ 
            appliedCourse: course,
            applicationDate: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`Applied for ${course}. Waiting for approval.`, 'success');
        
    } catch (error) {
        console.error('Error applying for course:', error);
        showNotification('Error submitting application', 'error');
    }
}

// Enhanced student loading for admin dashboard
async function loadStudents() {
    const studentsTable = document.getElementById('studentsTable');
    
    if (!studentsTable) return;
    
    try {
        // Show loading state
        studentsTable.innerHTML = '<tr><td colspan="6" class="text-center">Loading students...</td></tr>';
        
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .orderBy('glaNumber')
            .get();
        
        if (snapshot.empty) {
            studentsTable.innerHTML = '<tr><td colspan="6" class="text-center">No students found</td></tr>';
            return;
        }
        
        const students = [];
        snapshot.forEach(doc => {
            students.push({ id: doc.id, ...doc.data() });
        });
        
        // Generate table rows
        studentsTable.innerHTML = students.map(student => {
            const progress = student.progress || {};
            const progressBadges = generateProgressBadges(progress);
            const lastLogin = student.lastLogin ? 
                new Date(student.lastLogin.seconds * 1000).toLocaleDateString() : 'Never';
            
            return `
                <tr>
                    <td><strong>${student.glaNumber}</strong></td>
                    <td>${student.name || 'Not set'}</td>
                    <td>
                        <span class="badge ${student.approvedCourse ? 'bg-success' : 'bg-secondary'}">
                            ${student.approvedCourse || 'None'}
                        </span>
                    </td>
                    <td>${progressBadges}</td>
                    <td>
                        <span class="badge ${getScoreBadgeClass(student.score)}">
                            ${student.score || 'N/A'}
                        </span>
                    </td>
                    <td class="text-nowrap">
                        <div class="btn-group btn-group-sm" role="group">
                            <button class="btn btn-outline-primary" onclick="editStudent('${student.id}')" title="Edit">
                                ✏️
                            </button>
                            <button class="btn btn-outline-success" onclick="manageCourse('${student.id}')" title="Manage Course">
                                📚
                            </button>
                            <button class="btn btn-outline-danger" onclick="deleteStudent('${student.id}')" title="Delete">
                                🗑️
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update statistics
        updateAdminStats(students);
        
    } catch (error) {
        console.error('Error loading students:', error);
        studentsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading students</td></tr>';
        showNotification('Error loading students', 'error');
    }
}

// Generate progress badges for admin view
function generateProgressBadges(progress) {
    const badges = [];
    
    if (progress.videosDone) badges.push('<span class="badge bg-info me-1">Videos ✓</span>');
    if (progress.tutorialsDone) badges.push('<span class="badge bg-warning me-1">Tutorials ✓</span>');
    if (progress.testDone) badges.push('<span class="badge bg-success me-1">Test ✓</span>');
    
    return badges.length ? badges.join('') : '<span class="badge bg-secondary">Not started</span>';
}

// Get score badge class
function getScoreBadgeClass(score) {
    if (!score) return 'bg-secondary';
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-danger';
}

// Update admin dashboard statistics
function updateAdminStats(students) {
    const stats = {
        total: students.length,
        enrolled: students.filter(s => s.approvedCourse).length,
        completed: students.filter(s => s.progress?.testDone).length,
        avgScore: 0
    };
    
    // Calculate average score
    const scores = students.filter(s => s.score).map(s => s.score);
    if (scores.length > 0) {
        stats.avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    
    // Update UI elements
    updateStatElement('totalStudents', stats.total);
    updateStatElement('enrolledStudents', stats.enrolled);
    updateStatElement('completedStudents', stats.completed);
    updateStatElement('avgScore', stats.avgScore + '%');
}

// Update individual stat element
function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Enhanced course approval
async function approveCourse(uid, course) {
    if (!course) {
        showNotification('Please select a course', 'warning');
        return;
    }
    
    try {
        await db.collection('users').doc(uid).update({ 
            approvedCourse: course,
            appliedCourse: firebase.firestore.FieldValue.delete(),
            approvalDate: firebase.firestore.FieldValue.serverTimestamp(),
            progress: {
                videosDone: false,
                tutorialsDone: false,
                testDone: false
            }
        });
        
        showNotification(`Course "${course}" approved successfully`, 'success');
        await loadStudents();
        
    } catch (error) {
        console.error('Error approving course:', error);
        showNotification('Error approving course', 'error');
    }
}

// Enhanced student deletion
async function deleteStudent(uid) {
    const student = currentStudentData?.find(s => s.id === uid);
    const studentName = student ? (student.name || student.glaNumber) : 'this student';
    
    if (!confirm(`Are you sure you want to delete ${studentName}?\n\nThis action cannot be undone and will remove all progress data.`)) {
        return;
    }
    
    try {
        // Delete user document
        await db.collection('users').doc(uid).delete();
        
        showNotification('Student deleted successfully', 'success');
        await loadStudents();
        
    } catch (error) {
        console.error('Error deleting student:', error);
        showNotification('Error deleting student', 'error');
    }
}

// Enhanced notification system
function showNotification(message, type = 'info', duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.custom-notification');
    existingNotifications.forEach(n => n.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${getAlertClass(type)} alert-dismissible fade show position-fixed custom-notification`;
    notification.style.cssText = `
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }
}

// Map notification types to Bootstrap alert classes
function getAlertClass(type) {
    const typeMap = {
        'success': 'success',
        'error': 'danger',
        'warning': 'warning',
        'info': 'info'
    };
    
    return typeMap[type] || 'info';
}

// Enhanced global auth state handler
auth.onAuthStateChanged(async user => {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath === '/index.html' || currentPath === '/';
    
    if (user) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const userRole = userData.role;
                
                // Redirect based on role if on auth page
                if (isAuthPage) {
                    if (userRole === 'admin') {
                        window.location.href = '/admin-dashboard.html';
                    } else if (userRole === 'student') {
                        window.location.href = '/student-dashboard.html';
                    }
                    return;
                }
                
                // Verify user has access to current page
                const pageRoleMap = {
                    '/admin-dashboard.html': 'admin',
                    '/student-dashboard.html': 'student'
                };
                
                const requiredRole = pageRoleMap[currentPath];
                if (requiredRole && userRole !== requiredRole) {
                    showNotification('Access denied - redirecting...', 'error');
                    setTimeout(() => {
                        if (userRole === 'admin') {
                            window.location.href = '/admin-dashboard.html';
                        } else {
                            window.location.href = '/student-dashboard.html';
                        }
                    }, 2000);
                }
                
            } else {
                // User document doesn't exist
                showNotification('User profile not found', 'error');
                await auth.signOut();
            }
            
        } catch (error) {
            console.error('Auth state change error:', error);
            showNotification('Authentication error', 'error');
        }
        
    } else {
        // User is not authenticated
        if (!isAuthPage) {
            window.location.href = '/index.html';
        }
    }
});

// Utility functions for better UX
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error handling for common Firebase errors
function handleFirebaseError(error) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this GLA number',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Account already exists with this GLA number',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'permission-denied': 'Permission denied. Contact administrator',
        'unavailable': 'Service temporarily unavailable. Please try again'
    };
    
    return errorMessages[error.code] || error.message || 'An unexpected error occurred';
}

// Export functions for global use
window.GLALearning = {
    checkUserRole,
    loadStudentCourse,
    loadStudents,
    applyCourse,
    approveCourse,
    deleteStudent,
    showNotification,
    handleFirebaseError
};