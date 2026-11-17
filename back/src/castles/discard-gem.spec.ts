import { CastlesService } from './castles.service';
import { PrismaService } from '../prisma.service';

describe('discard equipment gems', () => {
  const deleteMany = jest.fn();
  const service = new CastlesService({ equipmentGem: { deleteMany } } as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());
  it('atomically deletes only the authenticated player’s stored gem', async () => {
    deleteMany.mockResolvedValue({ count: 1 });
    await expect(service.discardGem(7, 'gem-id')).resolves.toEqual({ success: true });
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'gem-id', gameProfile: { userId: 7 } } });
  });
  it('rejects missing, already inserted, or other players’ gems', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.discardGem(7, 'unavailable')).rejects.toThrow('not found');
  });
});
