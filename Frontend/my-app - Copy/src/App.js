// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import ExpenseForm from './components/ExpenseForm';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />         {/* Default login page */}
        <Route path="/login" element={<Login />} />    {/* Optional: Login route */}
        <Route path="/expense" element={<ExpenseForm />} /> {/* After login */}
      </Routes>
    </Router>
  );
}

export default App;

