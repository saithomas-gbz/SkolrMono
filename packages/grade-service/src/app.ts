import fastify from "fastify";
import dotenv from "dotenv";

dotenv.config();

const app = fastify();

app.get("/health", (req, res) => {
  res.send("OK");
});

async function start() {
  app.listen({ port: Number(process.env.PORT || 3007) }, (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Server is running on ${address}`);
  });
}

void start();
