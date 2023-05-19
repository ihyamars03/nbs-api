const express = require('express');
const app = express();
const router = express.Router()
const { pool } = require("../database/dbConfig");
const router = require('./attend');

const PORT = process.env.PORT || 4000;

app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Menangani permintaan GET pada root URL
/*app.get('/', (req, res) => {
  res.send('Hello, world!');
});*/
// Menangani permintaan GET pada URL /api/employees
router.get('/employees', (req, res) => {
  const { name, divisi } = req.query;
  let query = 'SELECT * FROM employees';

  // Check if name or divisi parameter is provided
  if (name || divisi) {
    query += ' WHERE';

    // Add name condition if provided
    if (name) {
      query += ` name LIKE '%${name}%'`;
    }

    // Add divisi condition if provided
    if (divisi) {
      if (name) {
        query += ' AND';
      }
      query += ` divisi LIKE '%${divisi}%'`;
    }
  }

  pool.query(query, (err, results) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const employees = results.rows;
      res.json(employees);
      console.log(employees);
    }
  });
});


// Menangani permintaan POST pada URL /api/employees
/*app.post('/api/employees', (req, res) => {
  // Logika untuk menambahkan data ke server atau basis data
  res.send('Data ditambahkan melalui API POST');
});*/

router.post('/employees', (req, res) => {
  let {
    name,
    position,
    divisi,
    wa,
    email,
    status,
    photo
  } = req.body;

  let errors = [];

  if (!name || !email) {
    errors.push({ message: "Please enter name and email" });
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
  } else {
    pool.query(
      'SELECT * FROM employees WHERE name = $1 OR email = $2',
      [name, email],
      (err, results) => {
        if (err) {
          console.error('Error executing query', err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          if (results.rows.length > 0) {
            for (let row of results.rows) {
              if (row.name === name && row.email === email) {
                errors.push({ message: "Name and Email already exist" });
                break;
              }
              if (row.name === name) {
                errors.push({ message: "Name already exists" });
                break;
              }
              if (row.email === email) {
                errors.push({ message: "Email already exists" });
                break;
              }
            }
            res.status(400).json({ errors });
          } else {
            pool.query(
              `INSERT INTO employees (name, position, divisi, wa, email, status, photo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
              [name, position, divisi, wa, email, status, photo],
              (err, results) => {
                if (err) {
                  console.error('Error executing query', err);
                  res.status(500).json({ error: 'Internal Server Error' });
                } else {
                  const insertedId = results.rows[0].id;
                  pool.query(
                    `SELECT * FROM employees WHERE id = $1`,
                    [insertedId],
                    (err, results) => {
                      if (err) {
                        console.error('Error executing query', err);
                        res.status(500).json({ error: 'Internal Server Error' });
                      } else {
                        const insertedEmployee = results.rows[0];
                        res.json({ message: "Successfully registered user", data: insertedEmployee });
                        console.log(insertedEmployee);
                      }
                    }
                  );
                }
              }
            );
          }
        }
      }
    );
  }
});

router.delete('/employees/:id', (req, res) => {
  const id = req.params.id;

  pool.query(
    'DELETE FROM employees WHERE id = $1',
    [id],
    (err, results) => {
      if (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (results.rowCount === 0) {
          res.status(404).json({ error: 'Employee not found' });
        } else {
          res.json({ message: 'Employee deleted successfully' });
        }
      }
    }
  );
});

module.exports = router