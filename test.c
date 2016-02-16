#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

#define SZ 255

int main(void) {
	int fd, sz;
	char buff[SZ];

	memset(buff,0,SZ);
	fd = open("/etc/passwd",O_RDONLY);
	sz = read(fd, buff, SZ-1);
	printf(buff);
	close(fd);
	
}
