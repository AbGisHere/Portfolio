# Portfolio Admin Dashboard Guide

Your portfolio now includes a secure admin dashboard where you can visually manage your projects without editing code!

## 🔐 Accessing the Admin Dashboard

### 1. Set Your Admin Password
Add this to your `.env` file:
```bash
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password_here
```

### 2. Navigate to Admin Panel
Go to: `http://localhost:3000/admin` (or your-domain.com/admin)

### 3. Login with Your Password
Use the password you set in step 1.

## 🎛️ What You Can Do

### **Project Visibility**
- ✅ **Toggle projects on/off** with eye icons
- 🚫 **Hide unwanted repos** from your portfolio
- 👁️ **Show only your best work**

### **Project Information**
- 📝 **Edit project titles** (custom display names)
- 📖 **Custom descriptions** (marketing copy)
- 🖼️ **Upload screenshots** (your own images)
- 🔗 **Set live demo URLs** (deployed apps)
- 🏷️ **Custom tech tags** (highlight skills)

### **Real-time Updates**
- 💾 **Save changes** instantly
- 🔄 **See updates** immediately on your portfolio
- 📱 **Mobile-friendly** admin interface

## 📋 Step-by-Step Usage

### 1. Login to Admin Dashboard
```
Visit: your-site.com/admin
Enter: your_admin_password
```

### 2. Review Your Projects
- See all your GitHub repositories
- Check visibility status (Visible/Hidden)
- View current project information

### 3. Customize Projects

#### **Toggle Visibility**
Click the eye icon to show/hide projects:
- 👁️ **Visible** = Shown in portfolio
- 👁️‍🗨️ **Hidden** = Not displayed

#### **Edit Project Info**
Click the edit icon (✏️) to modify:
- **Title**: Custom display name
- **Description**: Marketing-friendly description
- **Live URL**: Deployed application link
- **Screenshot**: Path to your image
- **Tags**: Technology stack (comma-separated)

#### **Add Screenshots**
1. Add images to `public/screenshots/`
2. Set path like: `/screenshots/my-project.png`

### 4. Save Changes
Click "Save Changes" button to:
- Update your portfolio immediately
- Store configuration securely
- Apply changes to live site

## 🔧 Advanced Features

### **Project Customization Example**
```typescript
// This is what gets generated behind the scenes
{
  'my-awesome-project': {
    customTitle: 'Awesome Web App',
    customDescription: 'A revolutionary application that transforms user experience',
    customImage: '/screenshots/awesome-app.png',
    customLiveUrl: 'https://awesome-app.vercel.app',
    tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    featured: true
  }
}
```

### **Configuration Storage**
- **Development**: Saved to localStorage
- **Production**: Saved to JSON file
- **Backup**: Auto-generates TypeScript config

### **Security Features**
- 🔐 **Password protected** admin access
- 🚫 **No public access** to configuration
- 🔒 **Secure API endpoints** for saving

## 🎯 Best Practices

### **Project Selection**
- ✅ Show only **completed projects**
- ✅ Include **live demos** when possible
- ✅ Use **professional screenshots**
- ✅ Write **compelling descriptions**

### **Screenshots**
- 📐 **Recommended size**: 1200x800px
- 🎨 **High quality** images
- 📱 **Show the interface** clearly
- 🌟 **Highlight key features**

### **Descriptions**
- 📝 **2-3 sentences** maximum
- 🎯 **Focus on impact** and results
- 💼 **Use professional language**
- 🔍 **Include key technologies**

### **Tags**
- 🏷️ **5-7 tags maximum**
- 💻 **Include main technologies**
- 🌟 **Highlight impressive skills**
- 📊 **Group similar technologies**

## 🚀 Deployment Considerations

### **Environment Variables**
```bash
# Required for admin access
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password

# Required for GitHub integration
NEXT_PUBLIC_GITHUB_USERNAME=your_github_username
```

### **File Permissions**
- Admin dashboard creates `data/project-config.json`
- Ensure write permissions on deployment
- Backup configuration regularly

### **Security Tips**
- 🔐 Use a **strong admin password**
- 🚫 Don't share admin URL publicly
- 🔄 Change password periodically
- 📝 Monitor admin access logs

## 🐛 Troubleshooting

### **Can't Access Admin Panel**
- Check password in `.env` file
- Ensure `NEXT_PUBLIC_ADMIN_PASSWORD` is set
- Try refreshing the page

### **Changes Not Saving**
- Check file permissions on `data/` directory
- Ensure API routes are working
- Check browser console for errors

### **Projects Not Updating**
- Refresh your portfolio page
- Check if changes were saved
- Verify GitHub username is correct

### **Screenshots Not Loading**
- Verify image paths are correct
- Check files exist in `public/screenshots/`
- Ensure proper file extensions (.png, .jpg)

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify environment variables
3. Ensure file permissions are correct
4. Check GitHub API rate limits

---

**Your portfolio is now fully customizable through the admin dashboard!** 🎉
