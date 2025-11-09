import { CheckoutService } from '../src/services/CheckoutService.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';
import { UserMother } from './builders/UserMother.js';
import { Item } from '../src/domain/Item.js';

describe('CheckoutService', () => {
  describe('quando o pagamento falha', () => {
    it('deve retornar null e não salvar o pedido nem enviar e-mail', async () => {
      // Arrange
      const carrinho = new CarrinhoBuilder().build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: false }),
      };

      const emailDummy = { enviarEmail: jest.fn() };
      const repoDummy = { salvar: jest.fn() };

      const checkoutService = new CheckoutService(
        gatewayStub,
        repoDummy,
        emailDummy
      );

      // Act
      const pedido = await checkoutService.processarPedido(carrinho, '1234-XXXX');

      // Assert
      expect(pedido).toBeNull();
      expect(repoDummy.salvar).not.toHaveBeenCalled();
      expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
    });
  });

  describe('quando um cliente Premium finaliza a compra', () => {
    it('deve aplicar o desconto e enviar e-mail de confirmação', async () => {
      // Arrange
      const userPremium = UserMother.umUsuarioPremium();
      const itens = [new Item('Teclado', 200)];
      const carrinho = new CarrinhoBuilder()
        .comUser(userPremium)
        .comItens(itens)
        .build();

      const gatewayStub = {
        cobrar: jest.fn().mockResolvedValue({ success: true }),
      };

      const pedidoRepoStub = {
        salvar: jest.fn().mockResolvedValue({ id: 101 }),
      };

      const emailMock = {
        enviarEmail: jest.fn().mockResolvedValue(true),
      };

      const checkoutService = new CheckoutService(
        gatewayStub,
        pedidoRepoStub,
        emailMock
      );

      // Act
      const pedido = await checkoutService.processarPedido(carrinho, '9999-XXXX');

      // Assert
      expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, '9999-XXXX');
      expect(pedidoRepoStub.salvar).toHaveBeenCalledTimes(1);
      expect(pedidoRepoStub.salvar).toHaveBeenCalledWith(
        expect.objectContaining({
          totalFinal: 180,
          status: 'PROCESSADO',
        })
      );
      expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
      expect(emailMock.enviarEmail).toHaveBeenCalledWith(
        'premium@email.com',
        'Seu Pedido foi Aprovado!',
        expect.stringContaining('Pedido 101 no valor de R$180')
      );
      expect(pedido).toEqual({ id: 101 });
    });
  });
});
