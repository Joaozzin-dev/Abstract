"""
Gera as vozes do jogo com voz neural (bem mais natural que a voz do aparelho).

Rode UMA vez, dentro desta pasta:
    pip install edge-tts
    python gerar_audios.py

Ele cria os .mp3 e reescreve o index.js que o jogo lê.
Quer trocar a voz? Mude o nome abaixo. Opções em pt-BR:
    pt-BR-FranciscaNeural (mulher) | pt-BR-ThalitaNeural (mulher, mais jovem) | pt-BR-AntonioNeural (homem)
"""
import asyncio
import pathlib

import edge_tts

AQUI = pathlib.Path(__file__).parent

# id (o mesmo usado no jogo): (voz, texto)
AUDIOS = {
    "julia_1": ("pt-BR-ThalitaNeural", "Oi, loja. Eu queria ver meu pedido, por favor."),
    "julia_2": ("pt-BR-ThalitaNeural", "Agora eu quero ver produtos."),
    "julia_3": ("pt-BR-ThalitaNeural", "Hum... ver."),
    "julia_4": ("pt-BR-ThalitaNeural", "Ah, não. Cancelar pedido."),
    "catia_final": ("pt-BR-FranciscaNeural", 'Oi, aqui é a Cátia. Eu acompanhei você desde o primeiro chamado até a inauguração. Vi você investigar antes de mexer no código, testar mais de um caso e não aceitar um "passou" só porque o código rodou. Isso é o que separa quem escreve código de quem entrega uma experiência. Por isso, a partir de amanhã, vou passar mais responsabilidade para você, no nível de dev pleno. Você vai assumir tickets inteiros, do relato da cliente até o teste de regressão. Eu continuo por perto, mas quero ver como você se sai por conta própria. E lembra: quando tiver dúvida, teste com as pessoas. Boa sorte!'),
}


async def main():
    for nome, (voz, texto) in AUDIOS.items():
        await edge_tts.Communicate(texto, voz, rate="-5%").save(str(AQUI / f"{nome}.mp3"))
        print("ok:", nome)
    linhas = ",\n".join(f"  {n}: require('./{n}.mp3')" for n in AUDIOS)
    (AQUI / "index.js").write_text(f"export default {{\n{linhas},\n}}\n", encoding="utf-8")
    print("index.js atualizado")


asyncio.run(main())
