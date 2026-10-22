import { describe, expect, it } from 'vitest';
import { parseTitle, youtubeId } from '../src/audio/music';

describe('Trilha', () => {
  it('reconhece links do YouTube', () => {
    const id = 'dQw4w9WgXcQ';
    for (const link of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&list=RD${id}&t=42s`,
      `https://youtu.be/${id}?si=abc123`,
      `youtu.be/${id}`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://music.youtube.com/watch?v=${id}&feature=share`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/live/${id}`,
      id,
    ])
      expect(youtubeId(link), link).toBe(id);
    for (const bad of ['', 'https://vimeo.com/123', 'https://www.youtube.com/', 'https://www.youtube.com/watch?v=curto', 'não é link'])
      expect(youtubeId(bad), bad).toBeNull();
  });

  it('separa artista e música', () => {
    expect(parseTitle('Thiaguinho - Buquê de Flores.mp3')).toEqual({ artist: 'Thiaguinho', title: 'Buquê de Flores' });
    expect(parseTitle('Menos é Mais - Lapada Dela (Ao Vivo)', false)).toEqual({ artist: 'Menos é Mais', title: 'Lapada Dela (Ao Vivo)' });
    // título do YouTube com ponto não perde o final
    expect(parseTitle('Turma do Pagode - Camisa 10 ft. Fulano', false).title).toBe('Camisa 10 ft. Fulano');
    expect(parseTitle('faixa_sem_artista.ogg')).toEqual({ artist: '', title: 'faixa sem artista' });
  });
});
