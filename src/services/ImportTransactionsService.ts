import { getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import path from 'path';
import fs from 'fs';
import Transaction from '../models/Transaction';

import uploadConfig from '../config/upload';
//import CreateTransactionService from './CreateTransactionService';
//import CategoriesRepository from '../repositories/CategoriesRepository';
import Category from '../models/Category';

interface TransactionsToImport {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(fileName: string): Promise<Transaction[]> {
    // APAGA ARQUIVO
    // const userAvatarFilePath = path.join(uploadConfig.directory, fileName);
    // const userAvatarFileExists = await fs.promises.stat(userAvatarFilePath);
    // if (userAvatarFileExists) {
    //   await fs.promises.unlink(userAvatarFilePath);
    // }

    const transactionsRepository = getRepository(Transaction);
    const categoriesRepository = getRepository(Category);

    const importTransactionsFilePath = path.join(
      uploadConfig.directory,
      fileName,
    );

    const readCSVStream = fs.createReadStream(importTransactionsFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactionsToImport: TransactionsToImport[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      transactionsToImport.push({
        title: line[0].trim(),
        type: line[1].trim(),
        value: line[2].trim(),
        category: line[3].trim(),
      });

      categories.push(line[3].trim());
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const exitentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = exitentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const newTransactions = transactionsRepository.create(transactionsToImport);

    await transactionsRepository.save(newTransactions);

    return newTransactions;
  }
}

export default ImportTransactionsService;
