Svarnas Coaching App
Semi-Personalised Training Plans for Endurance Sports

A web application allows:
An athlete to generate semi-personalised training plans for running, based on YAML-definend "master templates" and adjusted to his personal constrains and prefferences and are able to share the generated training plans via links that are public.
Coaches can be linked to athletes and view their training plans.A web application for running coaches and athletes. 

Started as a Final Project for University of London BSc Computer Science  - CM3020 and will be expand the functionallity in the future.


Technologies Used:

Backend:
    Node.js
    Express 5
    PostgreSQL 16
    JWT authentication
    bcrypt
    js-yaml

Frontend:
    React 19
    Vite 7

Database:
    PostgreSQL 16 (via Docker)

Tests:
    Jest 30, Supertest 7


Must have:
    Node.js v20 or higher
    Docker and Docker Compose


Folders Structure:


svarnas-coaching-app/
├── docker-compose.yml          # config the PostgreSQL container
├── .gitignore
│
├── svarnas-coaching-backend/
│   ├── server.js               # entry for the Express app
│   ├── db.js                   # connection pool of the db
│   ├── init.sql                # database schema 
│   ├── package.json
│   ├── .env                    
│   │
│   ├── routes/
│   │   ├── auth_routes.js          # signup, signin
│   │   ├── profile_routes.js       # Profile routes GET and PUT
│   │   ├── identify_routes.js      # Endpoints for users identity 
│   │   ├── coach_routes.js         # Linking a coach with an athlete
│   │   ├── training_plan_routes.js # Generating and managing training plans
│   │   └── share_training_plan_routes.js  # Creation or alternating the training plan share links
│   │
│   ├── middleware/
│   │   ├── auth_middleware.js   # user verification using JWT token
│   │   └── rate_limiter.js     # limits ip-requests
│   │
│   ├── helpers/
│   │   ├── trainingPlanGenerator.js  # The algorithms that chooses and adjusts the "master templates" to generate a training plan
│   │   └── yamlValidator.js          # Reading and validating the YAML "master templates"
│   │
│   ├── src/
│   │   └── training_plan_templates/
│   │       └── running/        # the "master templates"
│   │           ├── marathon_intermediate.yaml
│   │           ├── marathon_novice.yaml
│   │           ├── marathon_advanced.yaml
│   │           ├── hm_novice.yaml
│   │           ├── hm_intermediate.yaml
│   │           ├── hm_advanced.yaml
│   │           ├── 10k_novice.yaml
│   │           ├── 10k_intermediate.yaml
│   │           ├── 10k_advanced.yaml
│   │           ├── 5k_novice.yaml
│   │           ├── 5k_intermediate.yaml
│   │           └── 5k_advanced.yaml
│   │
│   └── tests/
│       ├── auth_test.js
│       ├── profile_test.js
│       ├── identify_test.js
│       ├── coach_test.js
│       ├── training_plan_test.js
│       ├── training_plan_generator_test.js
│       ├── shared_training_plans_test.js
│       └── complex_test.js
│
└── svarnas-coaching-frontend/
    ├── index.html
    ├── vite.config.js          # listening at localhost:3000
    ├── package.json
    └── src/
        ├── main.jsx            
        ├── App.jsx             
        ├── index.css           #styling
        └── views/
            ├── login.jsx               # Login
            ├── register.jsx            # Sign up
            ├── profile.jsx             # Editing profiles
            ├── coach_ui.jsx            # Coaching dashboard 
            ├── training_plans.jsx      # The view of a training plan
            └── shared_training_plan.jsx # The view of a shared training plan 
```


Instructions:

/--------------------------------------------------------------/
1. Create .env

    in  the root folder create .env file as:
        DB_NAME=svarnas_coaching
        DB_USER=svarnas_admin
        DB_PASS=your_password_here

    in the backend folder create .env file as:
        DB_HOST=localhost
        DB_PORT=5432
        DB_NAME=svarnas_coaching
        DB_USER=svarnas_admin
        DB_PASS=your_password_here
        PORT=3000
        JWT_SECRET=your_jwt_secret_here
        BCRYPT_ROUNDS=10
/--------------------------------------------------------------/        
2. Start the db

    from the main folder run: **docker compose up -d**
    PostgreSQL will start on port 5432

/--------------------------------------------------------------/
3. Initialise the db schema

    **docker exec -i svarnas-coaching-db-v5 psql -U {DB_USER} -d {DB_NAME} < svarnas-coaching-backend/init.sql**

/--------------------------------------------------------------/
4. Install Dependencies

    from the backend folder run: **npm install**
    from the frontend folder run: **npm install**

/--------------------------------------------------------------/

5. Start the Backend

    from the backend folder run: **npm start**
    listening on 3000 

/--------------------------------------------------------------/
6. Start the Frontend

    in a new terminal and in the frontend folder run: **npm run dev**
    listening on 5173. API handled by Vite 

/--------------------------------------------------------------/
7. Run the Svarnas Coaching App

    http://localhost:5173


/--------------------------------------------------------------/
/--------------------------------------------------------------/

Tests

    To run a test:
        from the backend folder run: **npx jest --verbose --forceExit**

Tests description

    auth_test.js - signup, signin, session validation, duplicate email, missing fields, wrong pass, invalid tokens
    
    profile_test.js - read and write profiles, validation of fields, validation of enums used, require user authentication  
    
    identify_test.js - identiny endpoints, coach can view only accepted identity of an athlete / access control
    
    coach_test.js - listin coaches, linkin and unlinking coaches to athletes, athletes can only be linked to coaches,   self coaching is not allowed
    
    training_plan_test.js - yaml master plan templates loading and parsing data, data validation and metadata checking

    training_plan_generator_test.js - adapting templates respect user constrains, api generation and fetching, access from otheres is rejected

    shared_training_plans_test.js - creation of links to share training plans, views, stop sharing links, wrong link id's

    complex_tests.js - rejecting expired tokens and unathenticated access to protected endpoints

/--------------------------------------------------------------/
API Reference

    API endpoints starts with /api
    endpoints that are protected requires the header: "Authorization: Bearer <jwt_token>"

/--------------------------------------------------------------/
API Endpoints

    AUTHENTICATION
        POST /api/singup || NO AUTH || register a new user as body {emai, pass}
        POST /api/signin || NO AUTH || sign in a user with body {emai,pass} and returns {jwt_token}
        GET /api/auth/session || AUTH || returing the info of the current session (user_id, email, role, how_we_call_you)

    PROFILE
        GET /api/profile || AUTH || get your own profile
        PUT /api/profile || AUTH || update your own profile by sending in the body the profile fiels ("private_first_name", "private_last_name", "how_we_call_you", "public_name", "level" (enum: novice/intermediate/advanced), "goal_distance" (enum: 5k/10k/hm/marathon), "race_date", "availability" (array: mon/tue/wed/thu/fri/sat/sun), "long_run_day") 

    IDENTITY
        GET /api/identity/myId || AUTH || user and profile info
        GET /api/identity/coach/:athleteId || AUTH || coach (if linked) can view the allowed fields 

    LINK COACH TO ATHLETE
        GET /api/coach/list-coaches || AUTH || listing users with the role 'coach'
        PUT /api/coach/set-coache || AUTH || link to a coach with body {coach_id}
        GET /api/coach/linked-coach || AUTH || get the linked coach
        DELETE /api/coach/remove-coach || AUTH || remove linked coach
        GET /api/coach/linked-atheles || AUTH || a coach can view athletes that are linked 

    TRAINING PLANS
        POST /api/training-plans/generate || AUTH || generates training plan from the profile data
        GET /api/training-plans || AUTH || the list of training plans that have been generated for each user
        GET /api/training-plans/:trainingPlanId || AUTH || single plan view (all data)

    SHARE LINKS
        POST /api/share/create-link || AUTH || creating a link to share a training plan using the body {plan_id}
        DELETE /api/share/:shareId || AUTH || stop sharing a link
        GET /api/share/:slug || NO AUTH || the view of a shared training plan without any sensitive data

    HELATH CHECK
        GET /api/ping || NO AUTH || backend and db health check

/--------------------------------------------------------------/
Database Schema

    users:
        email, hashed password, role (athlete/coach/admin), timestamps
    profiles:
        personal info, running level, goal distance, race date, weekly availability, long run day preference
    coaching: 
        one to one - stores athletes_id linked to coaches
    generated_training_plans:
        stores generated training plans as JSONB with their generation metadata
    shared_plans:
        assign slug to sharing links, stores the status (active/inactive), link to the corresponding training plan

    ENUMS:
        user_role =(athlete, coach, admin)
        running_level = (novice, intermediate, advanced)
        race_distance = (5k, 10k, hm, marathon)


/--------------------------------------------------------------/
Training Plan Generator

    2 Algorithms are used to generate a training plan.

        Algorithm 1 - The master plan template selection
            This algorithm matches the goal_distance and the level to the yaml master plan templates based on the target_distance and levels

        Algorithm 2 - The master plan adaptor
            Takes the template selected by Algorithm 1 and the data in the athletes profile (runs_per_week, longrun_day, race_date) and crops the template to serve only the weeks remaining until race day.
            Crops the less important runs of each week of the template to match the runs_per_week of each athlete e.g. if an athlete has set 5 runs_per_week it removes the 2 workouts with the lowest importance (highest number) and keep the rest 5 workouts of each week.
            Assign workouts iwth category "long_run" to the preferred long run day of the athlete. 
            Distributing the remaining workouts to the available_training_days of the athlete by preserving their order (order_in_week)

        
    All master training plan templates are stored as YAML files in the backend/src/training_plan_templates/running with their metadata (distance, level, duration_weeks) and all the workouts structured (warmup, steady, intervals, repeats, cooldown, progression).

/--------------------------------------------------------------/
Environment Variables

    MANDATORY
        DB_HOST - the host of the PostgreSQL db
        DB_PORT - the port of the PostgreSQL db
        DB_NAME - the name of the db
        DB_USER - the user name of the db
        DB_PASS - the password of the db
        JWT_SECRET - the key for the JWT signing

    OPTIONAL
        PORT - the backend server port (default: 3000)
        BCRYPT_ROUNDS - the rounds of hashing with bcrypt (default: 10)

/--------------------------------------------------------------/
SAMPLE DB POPULATION

    You can use the script sample_db_population.js to populate basic fields on the db after install to be able to test the app right away.
    To run the script run from the backend folder: **node sample_db_population.js** and you will have 3 users added in the db with their usernames and passwords shown as reply in th terminal.
