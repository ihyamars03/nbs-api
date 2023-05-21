const express = require('express');
const router = express.Router()
const { pool } = require("../database/dbConfig");

router.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// Menangani permintaan GET pada root URL
/*app.get('/', (req, res) => {
  res.send('Hello, world!');
});*/
// Menangani permintaan GET pada URL /api/employees
router.get('/all', (req, res) => {
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

router.post('/add', (req, res) => {
  let {
    name,
    position,
    divisi,
    wa,
    user_email,
    status,
    photo
  } = req.body;
  console.log(req.body);

  let errors = [];

  if (!name || !user_email) {
    errors.push({ message: "Mohon masukkan email dan password" });
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
  } else {
    pool.query(
      'SELECT * FROM users WHERE email = $1',
      [user_email],
      (err, results) => {
        if (err) {
          console.error('Error executing query', err);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          if (results.rows.length === 0) {
            errors.push({ message: "Email belum terdaftar" }); //Email does not exist in the users table
            res.status(400).json({ errors });
          } else {
            pool.query(
              'SELECT * FROM employees WHERE user_email = $1',
              [user_email],
              (err, results) => {
                if (err) {
                  console.error('Error executing query', err);
                  res.status(500).json({ error: 'Internal Server Error' });
                } else {
                  if (results.rows.length > 0) {
                    errors.push({ message: "Seorang karyawan sudah memakai email" });
                    res.status(400).json({ errors });
                  } else {
                    pool.query(
                      `INSERT INTO employees (name, position, divisi, wa, user_email, status, photo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING uuid`,
                      [name, position, divisi, wa, user_email, status, photo],
                      (err, results) => {
                        if (err) {
                          console.error('Error executing query', err);
                          res.status(500).json({ error: 'Internal Server Error' });
                        } else {
                          const insertedId = results.rows[0].uuid;
                          pool.query(
                            `SELECT * FROM employees WHERE uuid = $1`,
                            [insertedId],
                            (err, results) => {
                              if (err) {
                                console.error('Error executing query', err);
                                res.status(500).json({ error: 'Internal Server Error' });
                              } else {
                                const insertedEmployee = results.rows[0];
                                res.json({ message: "Berhasil menambahkan karyawan", data: insertedEmployee });
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
        }
      }
    );
  }
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;

  pool.query(
    'DELETE FROM employees WHERE uuid = $1',
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

router.get('/:id', (req, res) => {
  const id = req.params.id;

  pool.query(
    'SELECT * FROM employees WHERE uuid = $1',
    [id],
    (err, results) => {
      if (err) {
        console.error('Error executing query', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (results.rows.length === 0) {
          res.status(404).json({ error: 'Employee not found' });
        } else {
          const employee = results.rows[0];
          res.json(employee);
          console.log(employee);
        }
      }
    }
  );
})

module.exports = router