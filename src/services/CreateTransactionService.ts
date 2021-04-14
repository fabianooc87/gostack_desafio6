// import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoriesRepository from '../repositories/CategoriesRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getCustomRepository(CategoriesRepository);

    const balance = await transactionsRepository.getBalance();

    if (type === 'outcome' && balance.total < value) {
      throw new AppError(
        'The transaction could not be done due to the balance overflow.',
        400,
      );
    }

    let categoryPost = await categoriesRepository.findByTitle(category);

    if (!categoryPost) {
      const categoryNew = categoriesRepository.create({
        title: category,
      });
      categoryPost = categoryNew;
      await categoriesRepository.save(categoryNew);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryPost.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
