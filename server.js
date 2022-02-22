/* eslint-disable semi */
require('./mongoconnect');

const { buildSchema } = require('graphql');
const { graphqlHTTP } = require('express-graphql');
const jwt = require('jsonwebtoken');

const jwtSecret = 'husshh';
const express = require('express');
const User = require('./models/User');
const Post = require('./models/Post');
/*
1 - Fork the repo
2 - clone your repo after forking
3 - make the changes
 Edit POST   (the post owner)
 Delete POST  (the post owner)
 Post comment to post
[{
  userId,
  content
}]
 Query to comments of specific post
 Edit getAllPosts query to get comment
 4 - git add .
 5 - git commit -m "Lab"
 6 - git push origin main
*/

const schema = buildSchema(`
  "The data the user needs to enter to register"
  input UserRegistrationInput {
    username: String!
    password: String!
    firstName: String!
    lastName: String!
    age: Int
  }
  type LoginPayload {
    token: String
    error: String
  }
  type User{
    firstName: String!
    lastName: String!
    age: Int
  }
  type Post{
    content: String!
    user: User!
  }
  type Query{
    hello: String
    getMyPosts(token: String): [Post!]!
    getAllPosts: [Post!]!
  }
  type Mutation{
    createUser(userData: UserRegistrationInput): User
    loginUser(username: String, password: String): LoginPayload
    postCreate(token:String, content:String): String
  }
`);


const userMutations = {
    createUser: async({
        userData: {
            username,
            password,
            firstName,
            lastName,
            age,
        },
    }) => {
        const user = new User({
            username,
            password,
            firstName,
            lastName,
            age,
        });
        await user.save();
        return {
            firstName,
            lastName,
            age,
        };
    },
    loginUser: async({ username, password }) => {
        const user = await User.findOne({ username });
        if (!user) return { error: 'Login failed' };
        if (user.password !== password) return { error: 'Login failed' };
        const token = jwt.sign({ userId: user.id }, jwtSecret);
        return { token };
    },
};

const auth = async(token) => {
    try {
        const payload = jwt.verify(token, jwtSecret);
        const user = User.findById(payload.userId);
        return user;
    } catch (error) {
        return null;
    }
};


const postsMutation = {
    postCreate: async({ content, token }) => {
        const user = await auth(token);
        if (!user) return 'Authentication error';
        const userId = user.id;
        const post = new Post({ userId, content });
        await post.save();
        return 'Success';
    },
};


const postsQuery = {
    getMyPosts: async({ token }) => {
        const user = await auth(token);
        if (!user) return 'Authentication error';
        const userId = user.id;
        const posts = await Post.find({ userId });
        return posts.map(p => ({...p, user }));
    },

    getAllPosts: async() => {
        const posts = await Post.find({}).populate('userId')
        return posts.map(p => ({...p.toJSON(), user: p.userId }))
    },
};
//edit post
postEdit: async({ token, postID, newContent }) => {
        const user = await auth(token);
        if (!user) return "Authentication error";
        const userId = user.id;
        const post = await Post.findOneAndUpdate({ userId, _id: postID }, { content: newContent });
        await post.save();
        return "Successful Editing";
    }
    //delete post
postDelete: async({ token, postID }) => {
    const user = await auth(token);
    if (!user) return "Authentication error";
    const userId = user.id;
    await Post.findOneAndDelete({ userId, _id: postID });
    return "Deleted Successfully";
}
const commentMutations = {
    createComment: async({ token, postID, commentContent }) => {
        const user = await auth(token);
        if (!user) return "Authentication error";
        const userId = user.id;
        const post = await Post.find({ userId, _id: postID });
        post[0].comments.push({ commentContent });
        await post[0].save();
        return `Comment created successfully, there are ${post[0].comments.length} comments!`;
    }
};
const commentsQuery = {
    getComments: async({ token, postID }) => {
        const user = await auth(token);
        if (!user) return "Authentication error";
        const userId = user.id;
        const post = await Post.find({ userId, _id: postID });
        return post[0].comments;
    }
};

const rootValue = {
    ...userMutations,
    ...postsMutation,
    ...postsQuery,
    ...commentMutations,
    ...commentsQuery,
    hello: () => 'Hello world',
};

const app = express();

app.use('/graph', graphqlHTTP({ schema, rootValue, graphiql: true }));

app.listen(5000, () => {
    console.log('Server is runing');
});