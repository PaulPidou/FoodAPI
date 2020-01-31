# Food API ![Node CI](https://github.com/PaulPidou/FoodAPI/workflows/Node%20CI/badge.svg)

Backend of the react-native app [FoodApp](https://github.com/PaulPidou/FoodApp).

The app allows users to browse recipes and save them to later use. 
Users can search for recipes according to items within their fridges.
By default, when a recipe is saved the ingredients needed to it which are missing from the fridge are added to the shopping list of the user.

## Stack

The backend itself is developed in [express.js](https://expressjs.com).
The recipes are stored in MongoDB through the ODM [Mongoose](https://mongoosejs.com/).
And [Elasticsearch](https://www.elastic.co/elasticsearch) is used though [Mongoosastic](https://github.com/mongoosastic/mongoosastic) to index the recipes in order to be able to perform full-text search on them.

In addition to these needed components, the stack includes [Kibana](https://www.elastic.co/kibana) to visualize the data stored in Elasticsearch and [mongo-express](https://github.com/mongo-express/mongo-express) to explore the data stored in MongoDB.

To run the stack, simply run ```docker-compose up``` (You will need to have [Docker](https://www.docker.com/products/docker-desktop) installed)

This command will make the server run on the port 3000, the mongo-express interface will be accessible on the port 8081 and the Kibana interface will be accessible on the port 5601 of the machine where you are running the stack.

## API endpoints

There are several endpoints to communicate with the backend. Those endpoints are divided into three groups:
- Public: To query and retrieve information about recipes and ingredients
- User: To perform actions on the fridge, shopping list and saved recipes of an authenticated user
- Admin: To perform admin actions

To have a complete view of the available endpoints, run the stack and head to the [Swagger UI](https://swagger.io/tools/swagger-ui/) (SERVER_IP:3000/swagger/)