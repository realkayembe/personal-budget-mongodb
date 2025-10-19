// Budget API
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use('/', express.static('public'));

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/budgetdb';

mongoose.set('strictQuery', true);

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);

    const HEX6 = /^#[0-9A-Fa-f]{6}$/;

    const budgetItemSchema = new mongoose.Schema(
      {
        title: {
          type: String,
          required: [true, 'title is required'],
          trim: true,
          minlength: [1, 'title cannot be empty'],
        },
        budget: {
          type: Number,
          required: [true, 'budget is required'],
          min: [0, 'budget must be a non-negative number'],
        },
        color: {
          type: String,
          required: [true, 'color is required'],
          trim: true,
          match: [HEX6, 'color must be a 6-digit hex like #ED4523'],
        },
      },
      { collection: 'budgetitems', timestamps: true }
    );

    budgetItemSchema.index({ title: 1 }, { unique: true });

    const BudgetItem = mongoose.model('BudgetItem', budgetItemSchema);

    // fetch all items
    app.get('/budget', async (req, res) => {
      try {
        const items = await BudgetItem.find({}).lean();
        res.json({ myBudget: items });
      } catch (err) {
        console.error('GET /budget failed:', err);
        res.status(500).json({ error: 'Failed to fetch budget data' });
      }
    });

    // add a new budget item (all fields required, color strict hex)
    app.post('/budget', async (req, res, next) => {
      try {
        const { title, budget, color } = req.body;

        if (typeof title !== 'string' || title.trim() === '') {
          return res.status(400).json({ error: 'title is required' });
        }
        const numBudget =
          typeof budget === 'string' ? Number(budget) : budget;
        if (!Number.isFinite(numBudget) || numBudget < 0) {
          return res
            .status(400)
            .json({ error: 'budget must be a non-negative number' });
        }
        if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
          return res
            .status(400)
            .json({ error: 'color must be a 6-digit hex like #ED4523' });
        }

        await BudgetItem.create({ title: title.trim(), budget: numBudget, color });

        const items = await BudgetItem.find({}).lean();
        res.status(201).json({ myBudget: items });
      } catch (err) {
        if (err?.code === 11000) {
          return res
            .status(409)
            .json({ error: 'A budget item with this title already exists' });
        }
        next(err);
      }
    });

    app.use((err, req, res, next) => {
      if (err?.name === 'ValidationError') {
        const details = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: 'Validation failed', details });
      }
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });

    app.listen(port, () => {
      console.log(`API served at http://localhost:${port}`);
      console.log('MongoDB connected:', MONGODB_URI);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

start();
