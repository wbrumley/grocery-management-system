# grocery-management-system

A presentation overview of this project can be viewed here: https://docs.google.com/presentation/d/10qPw42LIH1QKd05VGez1E372Js-vbSDyBqp8IJew4p4/edit?usp=sharing

### Install VS Code, clone project, and install tools:
1. Download and install VS Code.
2. Open the VS Code terminal (View > Terminal)
3. Clone and open project from GitHub repo:
 
`git clone https://github.com/wbrumley/grocery-management-system.git`

`cd grocery-management-system`

4. Install Homebrew if on Mac:

`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

5. Install VS Code Python extension:
- Go to the Extensions view (View > Extensions).
- Install the Python extension: For managing Python files and virtual environments.

### Install and set up MySQL Server and MySQL Workbench:
1. Download the LTS version of MySQL Community for your operating system: https://dev.mysql.com/downloads/mysql/

2. Run and configure your local server
- Make sure the server is created locally. The password you create for root will be used to connect to the database in the project code.

3. Install MySQL Workbench for your operating system and connect to your local server: https://dev.mysql.com/downloads/workbench/
- Create a new local connection and attempt to connect with the password you have set for root

4. Populate database with appropriate tables for project using *sqlhistory* file
- Create a new schema in the database called 'grocery_db'. This name is also used in the project code to connect.

### Create and run Python virtual environment + application using Flask
1. Create and activate Python virtual environment:

`python3 -m venv venv`

`.\venv\Scripts\activate` <- On Windows

`source venv/bin/activate`  <- On Mac/Linux 

2. Install required Python packages:

`pip install flask flask-cors pymysql`

3. Run the application:

`python app.py` <- On Windows

`flask run` <- on Mac/Linux

4. Navigate to local site:
- Congratulations. The management system should be running at http://127.0.0.1:5000/static/index.html
