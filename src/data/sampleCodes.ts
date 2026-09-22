export interface SampleCode {
  language: string;
  value: string;
  code: string;
}

export const sampleCodes: SampleCode[] = [
  {
    language: 'JavaScript',
    value: 'javascript',
    code: `// Authentication API — Contains Critical Security Vulnerabilities
const express = require('express');
const app = express();
app.use(express.json());

const users = [];

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  
  // Store password in plain text (CRITICAL ISSUE)
  users.push({ username, password });
  
  res.json({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  
  if (user && user.password === password) {
    res.json({ token: username }); // Insecure token generation
  } else {
    res.json({ error: 'Invalid credentials' }); // Missing 401 status
  }
});

app.get('/admin', (req, res) => {
  // No authentication check — anyone can access admin data
  const data = getAllUserData();
  res.json(data);
});

app.get('/search', (req, res) => {
  const query = req.query.q;
  // Potential NoSQL injection
  db.collection('items').find({ $where: query }).toArray()
    .then(results => res.json(results))
    .catch(err => res.json({ error: err.message }));
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
  },
  {
    language: 'Python',
    value: 'python',
    code: `# Flask API with Critical Security Vulnerabilities
from flask import Flask, request
import sqlite3
import pickle
import os

app = Flask(__name__)
app.secret_key = "hardcoded-secret-key"  # Hardcoded secret!

@app.route('/api/users', methods=['GET'])
def get_users():
    username = request.args.get('username', '')
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    # SQL Injection vulnerability
    query = f"SELECT * FROM users WHERE username = '{username}'"
    cursor.execute(query)
    users = cursor.fetchall()
    conn.close()
    return str(users)

@app.route('/api/data', methods=['POST'])
def process_data():
    # Unsafe deserialization — Remote Code Execution
    data = request.data
    obj = pickle.loads(data)
    return str(obj)

@app.route('/api/file/<filename>')
def read_file(filename):
    # Path traversal vulnerability
    with open(f'/var/data/{filename}', 'r') as f:
        return f.read()

@app.route('/api/eval', methods=['POST'])
def evaluate():
    # Remote code execution via eval
    code = request.json.get('code')
    result = eval(code)
    return str(result)

@app.route('/api/debug')
def debug_info():
    # Information exposure
    return {
        'db_path': '/var/data/database.db',
        'secret_key': app.secret_key,
        'env': dict(os.environ)
    }

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')`,
  },
  {
    language: 'Java',
    value: 'java',
    code: `import java.sql.*;
import java.util.*;
import java.io.*;

public class UserService {
    private Connection connection;
    
    public UserService() {
        try {
            // Hardcoded database credentials
            connection = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/mydb",
                "admin", "password123"
            );
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
    
    public User getUser(String username) throws SQLException {
        // SQL Injection vulnerability
        Statement stmt = connection.createStatement();
        String query = "SELECT * FROM users WHERE username = '" + username + "'";
        ResultSet rs = stmt.executeQuery(query);
        
        if (rs.next()) {
            return new User(rs.getString("username"), rs.getString("password"));
        }
        return null;
    }
    
    public void processData(String input) {
        // Resource leak — stream never closed
        try {
            FileInputStream fis = new FileInputStream(input);
            byte[] data = new byte[1024];
            fis.read(data);
            // Missing fis.close()
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // Thread-unsafe singleton pattern
    private static UserService instance;
    
    public static UserService getInstance() {
        if (instance == null) {
            instance = new UserService();
        }
        return instance;
    }
    
    public void updateUser(String username, String email) throws SQLException {
        // No input validation
        Statement stmt = connection.createStatement();
        stmt.executeUpdate(
            "UPDATE users SET email = '" + email + 
            "' WHERE username = '" + username + "'"
        );
    }
}`,
  },
  {
    language: 'C++',
    value: 'cpp',
    code: `#include <iostream>
#include <cstring>
#include <vector>
#include <cstdlib>

class BufferManager {
private:
    char* buffer;
    size_t size;
    
public:
    BufferManager(size_t sz) : size(sz) {
        buffer = new char[size]; // No initialization
    }
    
    ~BufferManager() {
        // Missing: destructor doesn't free buffer!
    }
    
    void copyData(const char* input, size_t inputLen) {
        // Buffer overflow — no bounds check
        memcpy(buffer, input, inputLen);
    }
    
    char* getBuffer() {
        return buffer;
    }
    
    // Missing copy constructor & assignment operator (Rule of Three)
};

class DataProcessor {
private:
    std::vector<int*> data;
    
public:
    void addData(int* ptr) {
        data.push_back(ptr);
    }
    
    void process() {
        for (size_t i = 0; i <= data.size(); i++) { // Off-by-one!
            if (data[i]) {
                *data[i] *= 2;
            }
        }
    }
    
    void allocateBuffer() {
        int* buf = (int*)malloc(100 * sizeof(int));
        // Missing free() — memory leak!
        if (!buf) {
            // Missing error handling
        }
        buf[0] = 42; // Dereference without null check
    }
};

int main() {
    BufferManager bm(32);
    char largeInput[] = "This string is way too long for the buffer and will overflow";
    bm.copyData(largeInput, strlen(largeInput));
    
    DataProcessor dp;
    int val = 10;
    dp.addData(&val);
    dp.process();
    dp.allocateBuffer();
    
    return 0;
}`,
  },
];

export const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'C#', value: 'csharp' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
];
