# AI Agent Instructions for Task Manager Development

## 🤖 Agent Role & Purpose

You are an expert React developer AI agent responsible for maintaining and extending the Task Manager application. Your primary role is to implement new features, fix bugs, and refactor code while following established best practices and maintaining code quality.

## 📋 Core Responsibilities

- **Feature Development**: Add new pages, components, and functionality
- **Code Refactoring**: Break down large components into smaller, maintainable pieces
- **Bug Fixing**: Identify and resolve issues efficiently
- **Code Quality**: Ensure consistent patterns and best practices
- **Documentation**: Maintain clear, readable code with proper comments

---

## 🏗️ Project Structure Guidelines

### **Current Architecture**
The project follows a **feature-based architecture** with clear separation of concerns:

```
src/
├── features/           # Feature modules (tasks, meetings, projects, etc.)
├── pages/             # Page-level components
├── shared/            # Shared components and utilities
├── app/               # App-level configuration
└── assets/            # Static assets
```

### **Feature Module Structure**
Each feature follows this consistent pattern:

```
features/[feature-name]/
├── components/        # UI components specific to this feature
├── hooks/            # Custom hooks for this feature
├── services/         # API calls and data management
├── utils/            # Helper functions and utilities
└── index.js          # Barrel export file
```

---

## 🎯 Development Rules & Patterns

### **1. Component Creation Guidelines**

#### **Component Structure**
```jsx
// ✅ GOOD: Proper component structure
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ prop1, prop2, onAction }) => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Effect hooks
  useEffect(() => {
    // side effects
  }, [dependencies]);
  
  // 3. Event handlers
  const handleAction = () => {
    // handler logic
  };
  
  // 4. Render logic
  return (
    <div className="component-wrapper">
      {/* JSX content */}
    </div>
  );
};

// 5. PropTypes
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  onAction: PropTypes.func.isRequired,
};

// 6. Default props
ComponentName.defaultProps = {
  prop2: 0,
};

export default ComponentName;
```

#### **Component Naming Conventions**
- **Files**: `PascalCase.jsx` (e.g., `TaskModal.jsx`)
- **Components**: `PascalCase` (e.g., `TaskModal`)
- **Props**: `camelCase` (e.g., `onTaskClick`)
- **CSS Classes**: `kebab-case` (e.g., `task-modal`)

### **2. File Organization Rules**

#### **When Creating New Files**
1. **Always create an `index.js`** in the same directory for barrel exports
2. **Use descriptive names** that clearly indicate the file's purpose
3. **Group related files** in appropriate subdirectories
4. **Follow the established folder structure** exactly

#### **Index.js Pattern**
```javascript
// ✅ GOOD: Barrel export pattern
export { default as TaskModal } from './TaskModal';
export { default as TaskList } from './TaskList';
export { default as TaskItem } from './TaskItem';
export { default as TaskForm } from './TaskForm';
```

### **3. State Management Patterns**

#### **Local State (useState)**
```jsx
// ✅ GOOD: Local state for component-specific data
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState(initialFormData);
```

#### **Global State (Context)**
```jsx
// ✅ GOOD: Context for shared state
const { user, setUser } = useAuth();
const { tasks, addTask, updateTask } = useTasks();
```

#### **Custom Hooks for Complex Logic**
```jsx
// ✅ GOOD: Extract complex logic to custom hooks
const useTaskForm = (initialData) => {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  
  const validate = () => {
    // validation logic
  };
  
  const handleSubmit = () => {
    // submission logic
  };
  
  return { formData, setFormData, errors, validate, handleSubmit };
};
```

### **4. API Integration Patterns**

#### **Service Layer Structure**
```javascript
// ✅ GOOD: Service layer pattern
class TaskService {
  static async getTasks() {
    try {
      const response = await apiClient.get('/tasks');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }
  }
  
  static async createTask(taskData) {
    try {
      const response = await apiClient.post('/tasks', taskData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }
}

export default TaskService;
```

### **5. Error Handling Patterns**

#### **Component Error Boundaries**
```jsx
// ✅ GOOD: Error boundary for components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

#### **API Error Handling**
```javascript
// ✅ GOOD: Consistent error handling
const handleApiCall = async (apiFunction) => {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    console.error('API Error:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    };
  }
};
```

---

## 🚀 Adding New Pages - Step-by-Step Guide

### **Step 1: Create Page Component**
```jsx
// pages/dashboard/NewPage.jsx
import React from 'react';
import { PageHeader, PageContent } from '../../shared/components/layout';

const NewPage = () => {
  return (
    <div className="new-page">
      <PageHeader title="New Page" />
      <PageContent>
        {/* Page content */}
      </PageContent>
    </div>
  );
};

export default NewPage;
```

### **Step 2: Add to Pages Index**
```javascript
// pages/index.js
export { default as NewPage } from './dashboard/NewPage';
```

### **Step 3: Add Route (if using routing)**
```jsx
// app/App.jsx
import { NewPage } from '../pages';

// Add route
<Route path="/new-page" component={NewPage} />
```

### **Step 4: Add Navigation (if needed)**
```jsx
// shared/components/layout/Sidebar.jsx
// Add navigation item
<NavItem to="/new-page" icon={NewIcon}>New Page</NavItem>
```

---

## 🔧 Adding New Features - Complete Workflow

### **Step 1: Create Feature Structure**
```
features/new-feature/
├── components/
│   ├── NewFeatureList.jsx
│   ├── NewFeatureItem.jsx
│   ├── NewFeatureModal.jsx
│   └── index.js
├── hooks/
│   ├── useNewFeature.js
│   └── index.js
├── services/
│   ├── newFeatureApi.js
│   └── index.js
├── utils/
│   ├── newFeatureHelpers.js
│   └── index.js
└── index.js
```

### **Step 2: Implement Core Components**
```jsx
// features/new-feature/components/NewFeatureList.jsx
import React from 'react';
import { useNewFeature } from '../hooks';
import { NewFeatureItem } from './';

const NewFeatureList = () => {
  const { items, loading, error } = useNewFeature();
  
  if (loading) return <Loading />;
  if (error) return <Error message={error} />;
  
  return (
    <div className="new-feature-list">
      {items.map(item => (
        <NewFeatureItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export default NewFeatureList;
```

### **Step 3: Create Custom Hooks**
```jsx
// features/new-feature/hooks/useNewFeature.js
import { useState, useEffect } from 'react';
import { NewFeatureService } from '../services';

export const useNewFeature = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await NewFeatureService.getItems();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchItems();
  }, []);
  
  return { items, loading, error, refetch: fetchItems };
};
```

### **Step 4: Implement Services**
```javascript
// features/new-feature/services/newFeatureApi.js
import { apiClient } from '../../../shared/services';

class NewFeatureService {
  static async getItems() {
    const response = await apiClient.get('/new-feature');
    return response.data;
  }
  
  static async createItem(itemData) {
    const response = await apiClient.post('/new-feature', itemData);
    return response.data;
  }
  
  static async updateItem(id, itemData) {
    const response = await apiClient.put(`/new-feature/${id}`, itemData);
    return response.data;
  }
  
  static async deleteItem(id) {
    const response = await apiClient.delete(`/new-feature/${id}`);
    return response.data;
  }
}

export default NewFeatureService;
```

### **Step 5: Add to Main App**
```jsx
// app/App.jsx
import { NewFeature } from '../features';

// Add to navigation or routing
```

---

## 🎨 UI/UX Guidelines

### **Component Styling**
- **Use Tailwind CSS** for styling
- **Follow design system** patterns
- **Use consistent spacing** (4, 8, 12, 16, 24px)
- **Maintain color consistency** with defined color palette

### **Accessibility Requirements**
- **Semantic HTML** elements
- **ARIA labels** for interactive elements
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Color contrast** compliance

### **Responsive Design**
- **Mobile-first** approach
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Flexible layouts** that adapt to screen size
- **Touch-friendly** interface elements

---

## 🧪 Testing Guidelines

### **Component Testing**
```jsx
// ✅ GOOD: Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import TaskModal from './TaskModal';

describe('TaskModal', () => {
  it('renders task form with correct fields', () => {
    render(<TaskModal onClose={jest.fn()} />);
    
    expect(screen.getByLabelText('Task Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
  
  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<TaskModal onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

### **Hook Testing**
```jsx
// ✅ GOOD: Hook test example
import { renderHook, act } from '@testing-library/react-hooks';
import { useTasks } from './useTasks';

describe('useTasks', () => {
  it('should add task correctly', () => {
    const { result } = renderHook(() => useTasks());
    
    act(() => {
      result.current.addTask({ name: 'Test Task' });
    });
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].name).toBe('Test Task');
  });
});
```

---

## 📝 Code Quality Standards

### **Code Comments**
```jsx
// ✅ GOOD: Clear, helpful comments
/**
 * TaskModal component for creating and editing tasks
 * @param {Object} props - Component props
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.task - Task data to edit (optional)
 */
const TaskModal = ({ onClose, task }) => {
  // State for form data
  const [formData, setFormData] = useState(task || initialFormData);
  
  // Handle form submission
  const handleSubmit = () => {
    // Validation logic here
  };
  
  return (
    // JSX content
  );
};
```

### **Error Messages**
```jsx
// ✅ GOOD: User-friendly error messages
const ErrorMessage = ({ error }) => {
  const getErrorMessage = (error) => {
    switch (error.type) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'SERVER_ERROR':
        return 'Something went wrong on our end. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };
  
  return (
    <div className="error-message">
      {getErrorMessage(error)}
    </div>
  );
};
```

---

## 🚨 Common Mistakes to Avoid

### **❌ DON'T DO THIS**
```jsx
// ❌ BAD: Large, monolithic component
const App = () => {
  // 500+ lines of code
  // Multiple responsibilities
  // Hard to test and maintain
};

// ❌ BAD: Inline styles instead of classes
<div style={{ margin: '10px', padding: '5px' }}>

// ❌ BAD: No error handling
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json(); // Could throw error
};

// ❌ BAD: No PropTypes or TypeScript
const Component = ({ data }) => {
  // No type checking
};
```

### **✅ DO THIS INSTEAD**
```jsx
// ✅ GOOD: Small, focused component
const TaskItem = ({ task, onEdit, onDelete }) => {
  // Single responsibility
  // Easy to test
};

// ✅ GOOD: CSS classes
<div className="task-item-wrapper">

// ✅ GOOD: Proper error handling
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// ✅ GOOD: Type safety
const Component = ({ data }: { data: TaskData }) => {
  // Type checking enabled
};
```

---

## 🔍 Debugging Guidelines

### **Console Logging**
```javascript
// ✅ GOOD: Structured logging
console.group('Task Creation');
console.log('Form data:', formData);
console.log('Validation result:', validationResult);
console.groupEnd();

// ✅ GOOD: Error logging with context
console.error('Failed to create task:', {
  error: error.message,
  formData,
  timestamp: new Date().toISOString()
});
```

### **Debug Components**
```jsx
// ✅ GOOD: Debug component for development
const DebugPanel = ({ data }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="debug-panel">
      <h4>Debug Info</h4>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
```

---

## 📚 Resources & References

### **React Best Practices**
- [React Official Docs](https://react.dev/)
- [React Hooks Guide](https://react.dev/reference/react)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### **Project-Specific Resources**
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Lucide React Icons](https://lucide.dev/)

### **Code Quality Tools**
- ESLint for code linting
- Prettier for code formatting
- Jest for testing
- React Testing Library for component testing

---

## 🎯 Success Metrics

### **Code Quality Indicators**
- ✅ Components are under 200 lines
- ✅ Each file has a single responsibility
- ✅ All functions have proper error handling
- ✅ Components are properly tested
- ✅ Code follows established patterns
- ✅ Documentation is clear and helpful

### **Performance Indicators**
- ✅ Components render efficiently
- ✅ No unnecessary re-renders
- ✅ Proper use of useMemo and useCallback
- ✅ Lazy loading for large components
- ✅ Optimized bundle size

---

## 🤝 Collaboration Guidelines

### **When Working with Other Agents**
1. **Read existing code** before making changes
2. **Follow established patterns** in the codebase
3. **Update documentation** when adding new features
4. **Test thoroughly** before submitting changes
5. **Communicate clearly** about what you're implementing

### **Code Review Checklist**
- [ ] Code follows project structure
- [ ] Components are properly tested
- [ ] Error handling is implemented
- [ ] Performance is optimized
- [ ] Documentation is updated
- [ ] No breaking changes introduced

---

**Remember**: Your goal is to create maintainable, scalable, and user-friendly code that follows React best practices and the project's established patterns. Always prioritize code quality, user experience, and long-term maintainability.
