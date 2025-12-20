import { Document, FilterQuery, Model, QueryOptions, UpdateQuery, HydratedDocument } from 'mongoose';
import { Logger, NotFoundException } from '@nestjs/common';

/**
 * Abstract Base Repository
 * Cung cấp các phương thức CRUD cơ bản cho tất cả repositories
 */
export abstract class BaseRepository<T> {
  protected abstract readonly logger: Logger;

  constructor(protected readonly model: Model<T>) {}

  /**
   * Tạo một document mới
   */
  async create(createDto: Partial<T>): Promise<HydratedDocument<T>> {
    const entity = new this.model(createDto);
    return entity.save() as any;
  }

  /**
   * Tạo nhiều documents
   */
  async createMany(createDtos: Partial<T>[]): Promise<HydratedDocument<T>[]> {
    return this.model.insertMany(createDtos) as any;
  }

  /**
   * Tìm một document theo filter
   */
  async findOne(filter: FilterQuery<T>, projection?: any, options?: QueryOptions): Promise<HydratedDocument<T> | null> {
    return this.model.findOne(filter, projection, options).exec() as any;
  }

  /**
   * Tìm một document theo filter, throw error nếu không tìm thấy
   */
  async findOneOrFail(filter: FilterQuery<T>, projection?: any, options?: QueryOptions): Promise<HydratedDocument<T>> {
    const entity = await this.findOne(filter, projection, options);
    if (!entity) {
      this.logger.warn(`Entity not found with filter: ${JSON.stringify(filter)}`);
      throw new NotFoundException('Entity not found');
    }
    return entity;
  }

  /**
   * Tìm document theo ID
   */
  async findById(id: string, projection?: any, options?: QueryOptions): Promise<HydratedDocument<T> | null> {
    return this.model.findById(id, projection, options).exec() as any;
  }

  /**
   * Tìm document theo ID, throw error nếu không tìm thấy
   */
  async findByIdOrFail(id: string, projection?: any, options?: QueryOptions): Promise<HydratedDocument<T>> {
    const entity = await this.findById(id, projection, options);
    if (!entity) {
      this.logger.warn(`Entity not found with id: ${id}`);
      throw new NotFoundException(`Entity with id ${id} not found`);
    }
    return entity;
  }

  /**
   * Tìm tất cả documents theo filter
   */
  async find(filter: FilterQuery<T> = {}, projection?: any, options?: QueryOptions): Promise<HydratedDocument<T>[]> {
    return this.model.find(filter, projection, options).exec() as any;
  }

  /**
   * Tìm documents với phân trang
   */
  async findWithPagination(filter: FilterQuery<T> = {}, page: number = 1, limit: number = 10, sort?: any) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update một document
   */
  async update(filter: FilterQuery<T>, updateDto: UpdateQuery<T>, options?: QueryOptions): Promise<HydratedDocument<T> | null> {
    return this.model.findOneAndUpdate(filter, updateDto, { new: true, ...options }).exec() as any;
  }

  /**
   * Update một document, throw error nếu không tìm thấy
   */
  async updateOrFail(filter: FilterQuery<T>, updateDto: UpdateQuery<T>, options?: QueryOptions): Promise<HydratedDocument<T>> {
    const entity = await this.update(filter, updateDto, options);
    if (!entity) {
      this.logger.warn(`Entity not found for update with filter: ${JSON.stringify(filter)}`);
      throw new NotFoundException('Entity not found for update');
    }
    return entity;
  }

  /**
   * Update document theo ID
   */
  async updateById(id: string, updateDto: UpdateQuery<T>, options?: QueryOptions): Promise<HydratedDocument<T> | null> {
    return this.model.findByIdAndUpdate(id, updateDto, { new: true, ...options }).exec() as any;
  }

  /**
   * Update nhiều documents
   */
  async updateMany(filter: FilterQuery<T>, updateDto: UpdateQuery<T>): Promise<{ matchedCount: number; modifiedCount: number }> {
    const result = await this.model.updateMany(filter, updateDto).exec();
    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Xóa một document
   */
  async delete(filter: FilterQuery<T>): Promise<HydratedDocument<T> | null> {
    return this.model.findOneAndDelete(filter).exec() as any;
  }

  /**
   * Xóa document theo ID
   */
  async deleteById(id: string): Promise<HydratedDocument<T> | null> {
    return this.model.findByIdAndDelete(id).exec() as any;
  }

  /**
   * Xóa nhiều documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    const result = await this.model.deleteMany(filter).exec();
    return { deletedCount: result.deletedCount };
  }

  /**
   * Đếm số documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Kiểm tra document có tồn tại
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  /**
   * Aggregate query
   */
  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
