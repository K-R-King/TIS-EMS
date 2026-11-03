package TIS.EMS.controller;

import TIS.EMS.models.Employee;
import TIS.EMS.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/employees") // Base path for all employee endpoints
public class EmployeeController {

    @Autowired
    private EmployeeRepository employeeRepository;

    // ✅ Test Endpoint
    @GetMapping("/test")
    public String testApi() {
        return "Backend is working!";
    }

    // GET all employees
    @GetMapping
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    // GET one employee by ID
    @GetMapping("/{id}")
    public Optional<Employee> getEmployeeById(@PathVariable Long id) {
        return employeeRepository.findById(id);
    }

    // POST create new employee
    @PostMapping
    public Employee createEmployee(@RequestBody Employee employee) {
        return employeeRepository.save(employee);
    }

    // PUT update employee
    @PutMapping("/{id}")
    public Employee updateEmployee(@PathVariable Long id, @RequestBody Employee updatedEmployee) {
        return employeeRepository.findById(id).map(employee -> {
            employee.setName(updatedEmployee.getName());
            employee.setRole(updatedEmployee.getRole());
            employee.setEmail(updatedEmployee.getEmail());
            return employeeRepository.save(employee);
        }).orElseGet(() -> {
            updatedEmployee.setId(id);
            return employeeRepository.save(updatedEmployee);
        });
    }

    // DELETE employee
    @DeleteMapping("/{id}")
    public void deleteEmployee(@PathVariable Long id) {
        employeeRepository.deleteById(id);
    }
}
