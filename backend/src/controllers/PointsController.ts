import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {
  async create(request: Request, response: Response) {
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items,
    } = request.body;

    const trx = await knex.transaction();

    const point = {
      image: request.file.filename,
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
    };

    const insertsIds = await trx('points').insert(point);

    const point_id = insertsIds[0];

    const pointsItems = items
      .split(',')
      .map((item: string) => Number(item.trim()))
      .map((item_id: number) => {
        return {
          point_id: point_id,
          item_id,
        };
      });

    await trx('points_items').insert(pointsItems);
    await trx.commit();

    return response.json({ id: point_id, ...point });
  }

  async show(request: Request, response: Response) {
    const { id } = request.params;
    const point = await knex('points').where('id', id).first();

    if (!point) {
      return response.status(400).json({ message: 'Point not found.' });
    }

    const serializedPoints = {
      ...point,
      image_url: `http://192.168.100.65:3333/uploads/${point.image}`,
    };

    const items = await knex('items')
      .join('points_items', 'items.id', '=', 'points_items.item_id')
      .where('points_items.point_id', id);

    return response.json({ point: serializedPoints, items });
  }

  async index(request: Request, response: Response) {
    const { city, uf, items } = request.query;

    const parsedItems = String(items)
      .split(',')
      .map((item) => item.trim());

    const points = await knex('points')
      .join('points_items', 'points.id', '=', 'points_items.point_id')
      .whereIn('points_items.item_id', parsedItems)
      .where('city', String(city))
      .where('uf', String(uf))
      .distinct()
      .select('points.*');

    const serializedPoints = points.map((item) => {
      return {
        ...item,
        image_url: `http://192.168.100.65:3333/uploads/${item.image}`,
      };
    });

    return response.json(serializedPoints);
  }
}

export default PointsController;
