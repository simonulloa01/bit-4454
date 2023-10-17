const express = require('express');
const mysql = require('mysql');
const axios = require('axios');
const app = express();

app.use(express.json()); // for parsing application/json

// Replace with your actual database connection info
const db = mysql.createConnection({
    host: 'bitsem.mysql.database.azure.com',
    user: 'clay',
    password: 'Bit44542023',
    database: 'main'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to the database');
});

const PORT = 3000; // Replace with your actual port
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Function to create a session token
function generateSessionToken() {
    return crypto.randomBytes(64).toString('hex');
}
/**
 * Checks for an email is valid then sends a post to power automate 
 *           const postData = {
            firstName: user.FirstName,
            email: email,
            session_id: 'your_session_id_here' // Retrieve or generate session ID
          };
 */
app.post('/check-email', async (req, res) => {
    try {
        const email = req.body.email;
        if (!email) {
            return res.status(400).send('Email is required');
        }

        // Check if email exists in the 'student' or 'professor' table
        const query = `
        (SELECT 'student' as type, StudentID as id, FirstName FROM student WHERE Email = ?)
        UNION
        (SELECT 'professor' as type, ProfessorID as id, FirstName FROM professor WHERE Email = ?)
      `;

        db.query(query, [email, email], async (err, result) => {
            if (err) {
                return res.status(500).send('Error querying the database');
            }

            if (result.length > 0) {
                // Email found, prepare data for the external POST request
                const user = result[0];
                const postData = {
                    firstName: user.FirstName,
                    email: email,
                    session_id: 'your_session_id_here' // Retrieve or generate session ID
                };

                // Send POST request to another server
                try {
                    const response = await axios.post('https://external-server.com/api', postData);
                    res.status(200).send(response.data);
                } catch (error) {
                    res.status(500).send('Error sending POST request to external server');
                }
            } else {
                res.status(404).send('Email not found');
            }
        });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});
/**
 * Get the group members in a group
 */
app.get('/getGroupMembers', (req, res) => {
    const sessionId = req.query.session_id;
    const sectionId = req.query.section_id;
  
    if (!sessionId || !sectionId) {
      return res.status(400).send('Session ID and Section ID are required');
    }
  
    // First, get the student's ID from the session ID
    let query = 'SELECT student_id FROM sessions WHERE session_id = ?';
    db.query(query, [sessionId], (err, result) => {
      if (err) {
        return res.status(500).send('Error querying the database');
      }
  
      if (result.length === 0) {
        return res.status(404).send('Session not found');
      }
  
      const studentId = result[0].student_id;
  
      // Now, get all students from the same section, excluding the current student
      query = `
        SELECT s.StudentID, s.FirstName, s.LastName
        FROM studentgroups sg
        JOIN student s ON sg.StudentID = s.StudentID
        WHERE sg.CourseID = ? AND s.StudentID != ?
      `;
      db.query(query, [sectionId, studentId], (err, result) => {
        if (err) {
          return res.status(500).send('Error querying the database');
        }
  
        if (result.length === 0) {
          return res.status(404).send('No group members found');
        }
  
        res.status(200).json(result);
      });
    });
  });
  
