# Food API ![Node CI](https://github.com/PaulPidou/FoodAPI/workflows/Node%20CI/badge.svg)

Backend of the react-native app [FoodApp](https://github.com/PaulPidou/FoodApp).

The app allows users to browse recipes and save them for later use. 
Users can search for recipes according to items within their fridges.
By default, when a recipe is saved the needed ingredients which are missing from the fridge are added to the shopping list of the user.

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

## Algorithms details

### Find recipes based on ingredients
It can happen that one want to find suggestions of recipes based on the set of available ingredients.
The algorithm implemented within this backend to solve this issue is the following:

1. We retrieve, for each of the **N** available ingredients, the recipes in which they appear
2. We count the number of times each recipe is retrieved (it can only be retrieved a maximum of **N** times)
3. We compute the *listCoverage* for each recipe which corresponds to the count computed at the previous step divided by **N**
4. We compute the *recipeCoverage* for each recipe which corresponds to the count computed at step 2 divided by the number of ingredients within the recipe
5. Finally the compute a score for each recipe which is equal to: *a x listCoverage + (1 - a) x recipeCoverage* 
with *a* a coefficient between 0 and 1

Note that the score for each recipe will be between 0 and 1 and that, thanks to the coefficient *a*, it is possible to indicate 
if we would prefer have either recipes that we can cook right away or recipes which cover more ingredients from the available set 
(and which thus contain possibly more ingredients that those within the set of available ones).



### Find ingredients substitutes
It can happen that when one want to cook a recipe that there is no all the needed ingredients readily available. 
In this case, it will be suitable to be able to find substitutes to those particular ingredients.
To tackle this issue, it is possible to implement algorithms to automatically find replacements to missing ingredients.
If you are interested by this subject and by how it was implemented for this backend you can check this [notebook on Kaggle](https://www.kaggle.com/paulpidou/ingredient-vectors-from-pmi-matrix).
